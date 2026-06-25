# Helio Strap · Dashboard

Dashboard web para visualizar los datos de salud de un **Amazfit Helio Strap**,
con una UI inspirada y construida sobre los componentes de
[OpenFit](https://github.com/FlavioAdamo/openfit) (React + Tailwind), pero
adaptada a un tema propio ("instrumento solar") y a la fuente de datos de Zepp.

```
┌──────────┐   BLE    ┌──────────┐  cloud   ┌──────────────┐  /api   ┌─────────────┐
│  Helio   │ ───────▶ │ app Zepp │ ───────▶ │ nube Huami   │ ──────▶ │ backend     │
│  Strap   │          │ (móvil)  │          │ (api-mifit)  │         │ Python      │
└──────────┘          └──────────┘          └──────────────┘         └──────┬──────┘
                                                                            │ JSON
                                                                            ▼
                                                                     ┌─────────────┐
                                                                     │ UI React    │
                                                                     │ (este repo) │
                                                                     └─────────────┘
```

> El Helio Strap **no** se puede leer por Bluetooth desde el navegador (su BLE
> es propietario y cifrado). El camino realista es la **nube de Zepp/Huami**,
> usando la API no oficial documentada por la comunidad. Ver `backend/`.

## Estructura

| Carpeta | Qué es |
|---|---|
| `frontend/` | App Vite + React + TypeScript + Tailwind v4. UI del dashboard. |
| `backend/`  | API Python (FastAPI) que habla con la nube de Zepp y normaliza los datos. |

El contrato entre ambos es un único modelo: `HealthSnapshot`
(definido en `frontend/src/types.ts` y replicado por `backend/zepp/normalize.py`).
La UI no sabe de dónde vienen los datos — sólo consume ese modelo.

## Cómo correrlo

### 1. Frontend (modo demo, sin backend)

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Arranca con datos sintéticos (`VITE_DATA_SOURCE=demo` en `frontend/.env`).

### 2. Backend (datos reales de Zepp)

Se ejecuta **desde la raíz del repo** (la app es el paquete `backend.main`,
igual que en Vercel):

```bash
python3 -m venv backend/.venv && source backend/.venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env   # rellena token/credenciales (ver backend/TOKEN.md)
uvicorn backend.main:app --port 8000
```

Luego cambia `frontend/.env` a `VITE_DATA_SOURCE=zepp` y reinicia el frontend.
Vite ya tiene configurado el proxy `/api → localhost:8000`.

Sin credenciales, el backend sirve datos demo igualmente (útil para cablear).

### 3. Deploy a Vercel

Ya está todo listo (`vercel.json`, `api/index.py`, `requirements.txt` raíz).
Pasos y variables de entorno en **[DEPLOY.md](DEPLOY.md)**.

## Qué se reutilizó de OpenFit y qué es nuevo

- **Reutilizado:** el enfoque de UI con React + Tailwind, el patrón de
  "adaptadores que normalizan datos antes de pintarlos", y la estructura
  `components / data / lib / hooks`.
- **Nuevo / propio:** el tema visual "instrumento solar", los componentes de
  gráficas SVG (anillo solar, hipnograma de sueño, curva de HR, barras de
  actividad) y, sobre todo, el **adaptador de Zepp/Huami** en `backend/`
  (OpenFit hablaba con Google Health / Fitbit; aquí es Zepp).

## Aviso

La API de la nube de Zepp/Huami es **no oficial**: puede cambiar sin aviso y su
uso está en zona gris respecto a los términos de Zepp. Pensado para uso personal
con tus propios datos.
