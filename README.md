# SurfaceIQ

**External Attack Surface Monitoring (EASM) for the domains you own.**

SurfaceIQ discovers the public-facing assets behind a root domain, checks whether they are alive, inspects their TLS certificates, and turns what it finds into prioritised security findings. Add a domain once and a scan starts automatically; results appear in a dashboard you can filter and export.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)

---

## Features

- **Subdomain discovery**: enumerates subdomains from Certificate Transparency logs via [crt.sh](https://crt.sh).
- **DNS resolution**: resolves every discovered hostname to an IP address.
- **HTTP/HTTPS probing**: checks liveness (HTTPS first, then HTTP), status code, final URL and `Server` header.
- **TLS analysis**: reads each live host's certificate for issuer, expiry date, days remaining and certificate type.
- **Automatic findings**: converts probe and TLS results into findings with severity levels.
- **Auto-scan on add**: adding a target creates a scan and runs it in the background right away; you can also re-launch scans manually.
- **Per-user workspaces**: Firebase email/password sign-in, with all data stored under the signed-in user's own Firestore path.
- **Filtering and export**: filter findings by severity and by site, and export them to CSV.

### What it flags

| Finding | Severity | Trigger |
| --- | --- | --- |
| `tls_expired` | Critical | Certificate has expired |
| `missing_https` | High | Host only reachable over plain HTTP |
| `no_tls` | High | Live host with no TLS certificate found |
| `tls_self_signed` | High | Certificate subject equals its issuer |
| `tls_expiring` | Medium | Certificate expires in under 30 days |
| `tls_wildcard` | Low | Certificate uses a wildcard SAN |
| `server_header` | Low | `Server` header exposes software details |

---

## Architecture

```
┌──────────────────────┐   /api/*   ┌───────────────────────────┐
│  React + Vite SPA    │ ─────────► │  FastAPI backend          │
│  (easm-frontend)     │            │  (easm-backend)           │
│  Firebase Auth login │            │  verifies Firebase ID     │
└──────────────────────┘            │  token on every request   │
                                    └────────────┬──────────────┘
                                                 │ background task
                                    ┌────────────▼──────────────┐
                                    │  Scan engine              │
                                    │  crt.sh → DNS → HTTP →    │
                                    │  TLS → findings           │
                                    └────────────┬──────────────┘
                                                 │
                                    ┌────────────▼──────────────┐
                                    │  Cloud Firestore          │
                                    │  users/{uid}/targets      │
                                    │              /scans       │
                                    │              /assets      │
                                    │              /findings    │
                                    └───────────────────────────┘
```

The frontend sends the user's Firebase ID token as a `Bearer` token. The backend verifies it and scopes every query to that user's `uid`.

**Scan pipeline** (`easm-backend/scanner/engine.py`):

1. Mark the scan as `running`.
2. Enumerate subdomains from crt.sh (wildcards removed, root domain always included, capped at 100 hostnames per scan).
3. Resolve DNS, probe HTTP/HTTPS and, for live hosts, analyse the TLS certificate.
4. Write assets and generate findings in Firestore.
5. Mark the target `live` and the scan `completed` (or `failed` on error), with asset and finding counts.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, React Router 6, Vite 5, plain CSS |
| Auth | Firebase Authentication (email and password) |
| Backend | FastAPI, Uvicorn, Pydantic v2, HTTPX, dnspython, `cryptography` |
| Database | Cloud Firestore via the Firebase Admin SDK |
| Hosting | Frontend on Vercel (`/api` rewritten to the backend); backend on Render |

---

## Project structure

```
SurfaceIQ/
├── easm-backend/
│   ├── main.py              # FastAPI app, Firebase init, CORS, /health
│   ├── auth.py              # Firebase ID-token verification dependency
│   ├── config.py            # Settings (reads .env)
│   ├── requirements.txt
│   ├── routers/
│   │   ├── targets.py       # Add / list / delete monitored domains
│   │   ├── scans.py         # List and launch scans
│   │   ├── assets.py        # List discovered assets
│   │   └── findings.py      # List findings (severity filter)
│   └── scanner/
│       ├── engine.py        # Pipeline orchestration + finding rules
│       ├── subdomains.py    # crt.sh enumeration
│       ├── dns_resolver.py  # DNS resolution
│       ├── http_prober.py   # HTTP/HTTPS liveness probe
│       └── tls_analyzer.py  # TLS certificate inspection
└── easm-frontend/
    ├── src/
    │   ├── pages/           # Login, Dashboard, Assets, Scans, Findings
    │   ├── components/      # Shared navigation and SEO helper
    │   ├── context/         # AuthContext (Firebase session)
    │   └── services/firebase.js
    ├── vite.config.js       # Dev server on :3000, proxies /api → :8000
    └── vercel.json          # Rewrites /api/* to the hosted backend
```

---

## API

All routes except `/health` require `Authorization: Bearer <Firebase ID token>`. When running behind the Vercel rewrite, routes are reached under the `/api` prefix, which the backend strips.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Service health check |
| `GET` | `/targets` | List your monitored domains |
| `POST` | `/targets` | Add a domain (`root_domain`, optional `label`) and start a scan |
| `DELETE` | `/targets/{id}` | Remove a domain |
| `GET` | `/scans` | List scans, newest first |
| `POST` | `/scans` | Launch a scan for a target (`target_id`) |
| `GET` | `/assets` | List assets (filters: `root_domain`, `status`) |
| `GET` | `/findings` | List findings (filter: `severity`) |

Interactive API docs are available at `/docs` when the backend is running.

---

## Getting started

### Prerequisites
- Python 3.10 or later
- Node.js 18 or later
- A [Firebase](https://console.firebase.google.com) project with **Authentication** (Email/Password) and **Firestore** enabled

### 1. Clone

```bash
git clone https://github.com/Saksham07518/SurfaceIQ.git
cd SurfaceIQ
```

### 2. Run the backend

```bash
cd easm-backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `easm-backend/.env`:

```env
FIREBASE_PROJECT_ID=<your-firebase-project-id>
```

Provide Firebase Admin credentials in one of two ways:

- **Local development:** download a service account key from the Firebase console and point to it with `GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json` (Application Default Credentials).
- **Hosted environments:** set `FIREBASE_SERVICE_ACCOUNT_JSON` to the full contents of the service account JSON.

Never commit the key file; `serviceAccountKey.json` and `.env` are already git-ignored.

```bash
uvicorn main:app --reload --port 8000
```

### 3. Run the frontend

```bash
cd easm-frontend
npm install
```

Create `easm-frontend/.env` with your Firebase web app config:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

```bash
npm run dev
```

Open `http://localhost:3000`. The dev server proxies `/api` to the backend on port 8000.

### 4. Use it

1. Create an account on the login page.
2. On the **Dashboard**, add a root domain such as `example.com`. A scan starts automatically.
3. Follow progress on **Scans**, browse discovered hosts on **Assets**, and review issues on **Findings**.

---

## Deployment

- **Frontend (Vercel):** deploy `easm-frontend` and set the `VITE_FIREBASE_*` variables. `vercel.json` rewrites `/api/*` to the hosted backend URL; update that destination if you host the backend elsewhere.
- **Backend (Render or similar):** deploy `easm-backend` with `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_JSON` set. A typical start command is `uvicorn main:app --host 0.0.0.0 --port $PORT`.

---

## Responsible use

SurfaceIQ performs active probing (DNS lookups, HTTP requests and TLS handshakes) against every hostname it discovers. Only add domains that you own or are explicitly authorised to assess.

---

## Author

**Saksham**: [GitHub](https://github.com/Saksham07518)
