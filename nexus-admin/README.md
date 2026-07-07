# Nexus Admin

Standalone admin console for Nexus Analytics — deployed and hosted separately
from the main customer-facing app (`nexus-analytics/`), but talking to the
same FastAPI backend (`analytics_engine/`).

Every route in this app requires an admin session; only `/login` is public
(enforced by `middleware.ts`). Sign-in uses the same Supabase project as
`nexus-analytics`, so an existing account with `role = 'admin'` in
`public.users` can log in here directly.

## Env vars

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | The Render backend URL — same value as `nexus-analytics`. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same Supabase project as `nexus-analytics`. |
| `NEXT_PUBLIC_APP_URL` | Absolute URL of the main `nexus-analytics` deployment — used for "Back to Workspace" links since this app has no `/dashboard` route. |

## Deploying

Deploy as its own Vercel project on its own domain/subdomain (e.g.
`admin.<yourdomain>`). Add that domain to the backend's `ALLOWED_ORIGINS`
env var alongside the main app's domain (see `analytics_engine/.env.example`).

```bash
npm run dev    # http://localhost:3001 recommended, since 3000 is nexus-analytics
npm run build
npm run start
```
