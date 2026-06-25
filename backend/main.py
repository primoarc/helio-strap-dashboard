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

import os
import time
from datetime import datetime, timedelta
from pathlib import Path

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
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

_cache: dict[str, object] = {"at": 0.0, "data": None}


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
        if int(stp.get("ttl") or 0) > 0:
            continue

        hourly = [sum(steps[h * 60 : (h + 1) * 60]) for h in range(24)]
        stp["ttl"] = total
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


@app.get("/api/snapshot")
def snapshot(refresh: bool = False) -> dict:
    now = time.time()
    stale = _cache["data"] is None or now - float(_cache["at"]) > CACHE_TTL
    # refresh=1 (botón de la UI) ignora el caché y baja datos frescos de Zepp.
    if refresh or stale:
        _cache["data"] = _build_snapshot()
        _cache["at"] = now
    return _cache["data"]  # type: ignore[return-value]


@app.get("/api/health")
def health() -> dict:
    configured = _client() is not None
    return {
        "status": "ok",
        "zepp_configured": configured,
        "mode": "zepp" if configured else "demo",
        "cache_ttl": CACHE_TTL,
    }
