"""
API del backend de Helio Strap.

Expone el snapshot de salud ya normalizado para el frontend:
    GET /api/snapshot   → HealthSnapshot (mismo shape que frontend/src/types.ts)
    GET /api/health     → estado del servicio y de la conexión con Zepp

Fuente de datos según configuración (.env):
  - Si hay ZEPP_APP_TOKEN+ZEPP_USER_ID  → datos reales de la nube de Zepp.
  - Si hay ZEPP_EMAIL+ZEPP_PASSWORD     → login y datos reales.
  - Si no hay nada                       → snapshot demo (para cablear la UI).

Incluye un caché en memoria (TTL) para no golpear la API de Huami en cada
request — su endpoint de login tiene rate-limit estricto.
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.zepp.client import HuamiClient, ZeppError
from backend.zepp.demo import build_demo_snapshot
from backend.zepp.normalize import build_snapshot, extract_daily

# Carga backend/.env sin importar desde dónde se ejecute. En Vercel no existe
# .env y las variables vienen del dashboard (load_dotenv no falla si no hay).
load_dotenv(Path(__file__).resolve().parent / ".env")

CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "900"))  # 15 min por defecto
DAYS = 7

app = FastAPI(title="Helio Strap API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

_cache: dict[str, object] = {"at": 0.0, "data": None}
_brief_cache: dict[str, object] = {"date": None, "data": None}


def _client() -> HuamiClient | None:
    token = os.getenv("ZEPP_APP_TOKEN")
    user_id = os.getenv("ZEPP_USER_ID")
    email = os.getenv("ZEPP_EMAIL")
    password = os.getenv("ZEPP_PASSWORD")
    api_host = os.getenv("ZEPP_API_HOST")
    if token and user_id:
        return HuamiClient(app_token=token, user_id=user_id, api_host=api_host)
    if email and password:
        return HuamiClient(email=email, password=password)
    return None


# Métricas propietarias → (endpoint, eventType, subType, kind)
# 'v2'   = /v2/users/me/events   ·   'user' = /users/{id}/events
# Códigos + parsing confirmados contra respuestas reales del Helio Strap.
_METRIC_EVENTS = [
    ("readiness", "v2", "readiness", "watch_score", "readiness"),
    ("bodyBattery", "v2", "Charge", "summary", "hybridCharge"),
    ("exertion", "v2", "Charge", "real_data", "exertion"),
    ("hrv", "v2", "hrv_sdnn", "real_data", "hrv"),
    ("stress", "user", "all_day_stress", None, "stress"),
    ("spo2", "user", "blood_oxygen", "click", "spo2"),
]


def _metrics_by_date(client: HuamiClient, from_ms: int, to_ms: int) -> dict[str, dict]:
    """Trae cada métrica propietaria en ventana de 7 días y la agrupa por día."""
    by_date: dict[str, dict] = {}
    for key, endpoint, et, st, kind in _METRIC_EVENTS:
        if endpoint == "v2":
            events = client.events_v2(et, st, from_ms, to_ms)
        else:
            events = client.events_user(et, from_ms, to_ms, sub_type=st)
        for day, val in extract_daily(events, kind).items():
            by_date.setdefault(day, {})[key] = val
    return by_date


def _apply_activity_fallback(days: list[dict], step_by_date: dict[str, list[int]]) -> None:
    """Completa pasos desde detail.data si el resumen diario llega en cero."""
    for day in days:
        date = day.get("date") or day.get("date_time")
        steps = step_by_date.get(date) or []
        total = sum(steps)
        if not date or not total:
            continue

        parsed = day.setdefault("parsed", {})
        stp = parsed.setdefault("stp", {})
        current_total = int(stp.get("ttl") or 0)
        has_hourly = bool(stp.get("stage"))
        if current_total > 0 and has_hourly:
            continue

        hourly = [sum(steps[h * 60 : (h + 1) * 60]) for h in range(24)]
        use_detail_totals = total > current_total or not has_hourly
        stp["ttl"] = max(current_total, total)
        if use_detail_totals:
            stp["dis"] = int(total * 0.72)
            stp["cal"] = int(total * 0.04)
        else:
            stp["dis"] = int(total * 0.72) if not int(stp.get("dis") or 0) else stp["dis"]
            stp["cal"] = int(total * 0.04) if not int(stp.get("cal") or 0) else stp["cal"]
        stp["runDist"] = sum(1 for v in steps if v) * 100
        stp["stage"] = [
            {"start": h * 60, "stop": (h + 1) * 60, "step": value}
            for h, value in enumerate(hourly)
            if value
        ]


def _real_snapshot(client: HuamiClient) -> dict:
    now = datetime.now()
    to_date = now.strftime("%Y-%m-%d")
    from_date = (now - timedelta(days=DAYS - 1)).strftime("%Y-%m-%d")
    from_ms = int((now - timedelta(days=DAYS - 1)).timestamp() * 1000)
    to_ms = int(now.timestamp() * 1000)

    days = client.band_data(from_date, to_date)

    # HR intradía (curva del chart) para hoy y ayer; barato y suficiente.
    yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    hr_by_date = {
        to_date: client.heart_rate(to_date),
        yesterday: client.heart_rate(yesterday),
    }
    step_by_date = {
        to_date: client.activity_steps(to_date),
    }
    _apply_activity_fallback(days, step_by_date)

    metrics_by_date = _metrics_by_date(client, from_ms, to_ms)

    device = {
        "name": "Helio Strap",
        "model": "Amazfit Helio",
        "battery": int(os.getenv("DEVICE_BATTERY", "0")) or 0,
        "lastSync": now.isoformat(),
    }
    return build_snapshot(
        days,
        hr_by_date,
        device,
        user_name=os.getenv("USER_NAME", "Atleta"),
        metrics_by_date=metrics_by_date,
    )


def _build_snapshot() -> dict:
    client = _client()
    if client is None:
        return build_demo_snapshot()
    try:
        return _real_snapshot(client)
    except (ZeppError, Exception) as e:  # noqa: BLE001 — degradar a demo, no caer
        snap = build_demo_snapshot()
        snap["device"]["model"] = f"Amazfit Helio (demo · {type(e).__name__})"
        return snap


def _compact_snapshot(snap: dict) -> dict:
    today = snap["today"]
    week = snap["week"]
    return {
        "date": today["date"],
        "source": snap.get("source"),
        "readiness": today["readiness"],
        "hybrid_charge": today["bodyBattery"],
        "exertion": today["exertion"],
        "stress": today["stress"],
        "spo2": today["spo2"],
        "sleep": {
            "score": today["sleep"]["score"],
            "minutes": today["sleep"]["totalMinutes"],
            "efficiency": today["sleep"]["efficiency"],
        },
        "heart": {
            "current": today["heart"]["current"],
            "resting": today["heart"]["resting"],
            "min": today["heart"]["min"],
            "max": today["heart"]["max"],
            "hrv": today["heart"]["hrv"],
        },
        "activity": {
            "steps": today["activity"]["steps"],
            "goal": today["activity"]["stepsGoal"],
            "distance_km": today["activity"]["distanceKm"],
            "calories": today["activity"]["calories"],
            "active_minutes": today["activity"]["activeMinutes"],
        },
        "week": [
            {
                "date": d["date"],
                "readiness": d["readiness"],
                "sleep": d["sleep"]["score"],
                "hrv": d["heart"]["hrv"],
                "rhr": d["heart"]["resting"],
                "stress": d["stress"],
                "hybrid_charge": d["bodyBattery"],
                "exertion": d["exertion"],
            }
            for d in week
        ],
    }


def _local_daily_brief(compact: dict) -> dict:
    readiness = int(compact["readiness"])
    sleep = int(compact["sleep"]["score"])
    hrv = int(compact["heart"]["hrv"])
    stress = int(compact["stress"])
    exertion = int(compact["exertion"])
    spo2 = int(compact["spo2"])
    hybrid = int(compact["hybrid_charge"])
    steps = int(compact["activity"]["steps"])

    mode = "Empujar" if readiness >= 75 else "Construir" if readiness >= 55 else "Proteger"
    focus = "recuperación" if readiness < 55 else "base aeróbica" if exertion <= 10 else "carga moderada"
    warnings = []
    if spo2 and spo2 < 90:
        warnings.append("SpO2 baja: repite medición y revisa ajuste del strap.")
    if stress >= 60:
        warnings.append("Estrés alto: baja intensidad si notas fatiga.")

    return {
        "date": compact["date"],
        "generatedAt": datetime.now().isoformat(),
        "source": "local",
        "title": f"{mode}: readiness {readiness}",
        "summary": (
            f"Sueño {sleep}, HRV {hrv} ms, Hybrid {hybrid} y estrés {stress}. "
            f"Llevas {steps:,} pasos y exertion {exertion}%."
        ),
        "recommendation": (
            "Buen día para zona 2, técnica o fuerza controlada."
            if mode == "Construir"
            else "Puedes empujar si el plan lo pide."
            if mode == "Empujar"
            else "Prioriza recuperación, movilidad y sueño."
        ),
        "focus": focus,
        "bullets": [
            f"Readiness {readiness}: {mode.lower()}.",
            f"Sueño {sleep} con {compact['sleep']['minutes'] // 60}h {compact['sleep']['minutes'] % 60:02d}m.",
            f"HRV {hrv} ms y RHR {compact['heart']['resting']} ppm.",
            f"Exertion {exertion}% con {steps:,} pasos.",
        ],
        "warnings": warnings,
    }


def _parse_openai_text(payload: dict) -> str:
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"]
    chunks: list[str] = []
    for item in payload.get("output", []) or []:
        for content in item.get("content", []) or []:
            text = content.get("text")
            if isinstance(text, str):
                chunks.append(text)
    return "\n".join(chunks).strip()


def _openai_daily_brief(compact: dict) -> dict:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _local_daily_brief(compact)

    model = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")
    timeout = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "30"))
    prompt = {
        "role": "user",
        "content": (
            "Genera un brief matutino de wellness en español para un atleta recreativo. "
            "Usa solo estos datos, no diagnostiques enfermedades y no des consejo médico. "
            "Devuelve JSON válido con las claves: title, summary, recommendation, focus, bullets, warnings. "
            "bullets y warnings deben ser arrays de strings. Sé concreto, estilo WHOOP, máximo 90 palabras entre summary y recommendation.\n\n"
            f"DATOS:\n{json.dumps(compact, ensure_ascii=False)}"
        ),
    }
    body = {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": "Eres un coach de recuperación. Sé directo, práctico y conservador.",
            },
            prompt,
        ],
    }
    try:
        r = requests.post(
            "https://api.openai.com/v1/responses",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=timeout,
        )
        r.raise_for_status()
        text = _parse_openai_text(r.json())
        parsed = json.loads(text)
        return {
            "date": compact["date"],
            "generatedAt": datetime.now().isoformat(),
            "source": "openai",
            "title": str(parsed.get("title") or "Brief diario"),
            "summary": str(parsed.get("summary") or ""),
            "recommendation": str(parsed.get("recommendation") or ""),
            "focus": str(parsed.get("focus") or "recuperación"),
            "bullets": [str(x) for x in parsed.get("bullets", [])][:5],
            "warnings": [str(x) for x in parsed.get("warnings", [])][:3],
        }
    except Exception:
        brief = _local_daily_brief(compact)
        brief["source"] = "local-fallback"
        return brief


@app.get("/api/snapshot")
def snapshot(refresh: bool = False) -> dict:
    now = time.time()
    stale = _cache["data"] is None or now - float(_cache["at"]) > CACHE_TTL
    # refresh=1 (botón de la UI) ignora el caché y baja datos frescos de Zepp.
    if refresh or stale:
        _cache["data"] = _build_snapshot()
        _cache["at"] = now
    return _cache["data"]  # type: ignore[return-value]


@app.get("/api/daily-brief")
def daily_brief(refresh: bool = False) -> dict:
    snap = snapshot(refresh=refresh)
    compact = _compact_snapshot(snap)
    if (
        not refresh
        and _brief_cache["date"] == compact["date"]
        and _brief_cache["data"] is not None
    ):
        return _brief_cache["data"]  # type: ignore[return-value]

    brief = _openai_daily_brief(compact)
    _brief_cache["date"] = compact["date"]
    _brief_cache["data"] = brief
    return brief


@app.get("/api/health")
def health() -> dict:
    configured = _client() is not None
    return {
        "status": "ok",
        "zepp_configured": configured,
        "mode": "zepp" if configured else "demo",
        "cache_ttl": CACHE_TTL,
        "ai_brief_configured": bool(os.getenv("OPENAI_API_KEY")),
    }
