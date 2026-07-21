# Nexus Analytics

An AI-powered marketing analytics platform that connects to real ad accounts (Meta Ads, with Google/LinkedIn/TikTok modeled in the schema), processes performance data through a full analytics pipeline, and surfaces it through a live dashboard, AI recommendations, and a conversational assistant — with a separate role-gated admin console for account management.

## Architecture

This is a monorepo with three independently deployed applications sharing one Supabase project:

| App | Stack | Role | Deploy target |
|---|---|---|---|
| `nexus-analytics/` | Next.js 15, React 19, Tailwind | Customer-facing dashboard | Vercel |
| `nexus-admin/` | Next.js 15, React 19, Tailwind | Admin console (role-gated) | Vercel |
| `analytics_engine/` | FastAPI, Python 3.11 | Analytics API + data pipeline | Render |

```
Meta Graph API ──► analytics_engine ──► ClickHouse Cloud (analytics data)
                          │
                          └──► Supabase Postgres (accounts, users, auth)
                          │
                          └──► DeepSeek AI (recommendations, chat)

nexus-analytics ──► analytics_engine  (Supabase-authenticated REST calls)
nexus-admin     ──► analytics_engine  (admin-only endpoints)

dbt seeds ──► dbt (own ClickHouse Cloud trial) ──► nexus_staging / nexus_marts
```

`dbt/` is a standalone transformation-layer demo: nightly (GitHub Actions)
`dbt seed && dbt run && dbt test` against its own free ClickHouse Cloud
trial, mirroring the shape of `analytics_engine`'s real tables without
touching the production instance or the live dashboard. See `dbt/README.md`.

Both frontends authenticate against the same Supabase project but are fully separate deployments — a customer never sees admin routes, and vice versa, even under a Supabase outage (both apps fail closed to their login page rather than exposing protected content).

## Features

### Dashboard & analytics (`nexus-analytics`)
- **Executive KPI overview** — spend, revenue, ROAS, CPA, CTR, conversions, profit, and an AI-computed health score, each with period-over-period change indicators.
- **AI Command Center** — active alerts, the single highest-priority recommendation with a confidence score, and one-click quick actions (approve / reject / schedule).
- **Campaign Analytics** — per-campaign health scoring, trend detection, and historical performance.
- **Audience, Keyword, and Creative Analytics** — demographic/device/geo breakdowns, keyword opportunity heatmaps, and creative fatigue scoring.
- **Trend Forecasting** — 30-day forward metric forecasts with confidence bands.
- **AI recommendations** — DeepSeek-generated insights grounded in real ClickHouse metrics, with a rule-based fallback when the AI is unavailable.
- **Conversational assistant** — a chat widget that answers plain-English questions about your own live numbers (two tiers: instant rule-based matching for common questions, DeepSeek for everything else — grounded strictly in real data, never hallucinated).
- **Live Meta Ads integration** — connect a real ad account with a pasted access token (no OAuth app review required); data syncs automatically in the background and on-demand.
- **Simulated checkout/plans flow** — for demo purposes; no real payment processor is wired up.

### Admin console (`nexus-admin`)
- User list with role management (promote/demote between `member` and `admin`).
- Integration status overview.
- Fully separate deployment/domain from the customer app, sharing only the Supabase user base.

### Backend (`analytics_engine`)
- FastAPI REST API backing both frontends.
- **Direct Meta Ads sync** (`integrations/meta_ads.py`) — fetches campaign insights straight from the Graph API and writes to ClickHouse, with automatic staleness-based refresh (no external automation tool required to keep data current).
- **Multi-tenant data isolation** — every account's ingested data, cached recommendations, and KPI snapshots are scoped by `account_id`; one user can never see another's connected ad account data.
- **ClickHouse Cloud** for time-series analytics data; **Supabase Postgres** for accounts/auth.
- Row-level security plus column-level grants on the Supabase `users` table (self-service profile edits are restricted to non-privileged fields only).
- Per-user rate limiting on the AI chat endpoint.

## Tech stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts
- **Backend:** FastAPI, Python 3.11, httpx, psycopg2
- **Data:** ClickHouse Cloud (analytics), Supabase Postgres (accounts/auth), dbt-core (batch transforms/tests over ClickHouse)
- **AI:** DeepSeek (OpenAI-compatible API) for recommendations and chat
- **Auth:** Supabase Auth (email/password)
- **Hosting:** Vercel (both frontends), Render (backend)

## Repository layout

```
nexus-analytics/     Customer-facing Next.js app
nexus-admin/         Admin console Next.js app
analytics_engine/    FastAPI backend + data pipeline
dbt/                 dbt-core project: batch transforms/tests over ClickHouse
docs/                Design notes and scoping docs for future work
.github/workflows/   CI/keep-alive automation
```

## Local development

Each app has its own `.env.example` — copy to `.env` / `.env.local` and fill in real values before running.

```bash
# Backend
cd analytics_engine
pip install -r requirements.txt
uvicorn main:app --reload

# Customer frontend
cd nexus-analytics
npm install
npm run dev

# Admin console
cd nexus-admin
npm install
npm run dev
```

## Deployment notes

- The backend is a single lightweight FastAPI container (no bundled automation tooling) — this keeps it comfortably within free-tier resource limits.
- A GitHub Actions workflow (`.github/workflows/keep-alive.yml`) pings the backend's health endpoint every 10 minutes to prevent it from idling on Render's free tier.
- Real ad account data refreshes itself automatically on read (if stale) — the dashboard doesn't depend on any separate automation service being online.
