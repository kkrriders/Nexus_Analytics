# Admin: Per-User Ad Platform API Access Control

**Status:** Backlog / not started — scoping note only.

## The idea

Admins should be able to see which ad platform APIs (Google Ads, Meta Ads,
LinkedIn Ads, TikTok Ads) each user has connected, and revoke a specific
platform's access independently.

Example: a user connects Google Ads in month 1, then switches to Meta Ads in
month 2. Admin should be able to revoke that user's Google Ads access without
touching their Meta Ads connection.

## Why it matters

For a multi-tenant marketing platform, per-user OAuth connections need
admin-side visibility and revocation for two reasons:
- **Security** — an offboarded or switched-off user's token should be killable
  immediately, per platform.
- **Compliance** — admins need an audit trail of who has access to what
  external ad account data.

## Why it's a bigger build than it looks

This is not just a UI toggle. It requires:
- Registering real OAuth apps with Google Ads API and Meta Marketing API
  (and LinkedIn/TikTok if those get built out too).
- Encrypted storage of access + refresh tokens per user, per platform.
- Token refresh/expiry handling.
- A revoke flow that actually invalidates the token at the provider (not just
  hides it in our UI).
- Admin UI: per-user, per-platform connection status + a revoke action.

## Current state (as of this note)

- `admin/(console)/integrations` and the dashboard's "Automation Status" /
  "Platform Performance" sections are **100% static mock data** — there are no
  real OAuth connections to revoke yet.
- Real user auth (Supabase) and admin role-gating are already built and live —
  see `analytics_engine/database/create_users_schema.sql` and
  `nexus-analytics/src/app/admin/`.

## Suggested approach when picked up

1. Pick one platform first (likely Google Ads, since it's first in the mock
   platform list) and build its OAuth flow end-to-end before adding others.
2. Store tokens in Postgres (Supabase), encrypted at rest, keyed by
   `(user_id, platform)`.
3. Build the admin revoke action to call the provider's token-revocation
   endpoint, then delete/mark-revoked the local record.
4. Wire the existing static "Automation Status" / "Platform Performance"
   sections to real per-user connection state once at least one platform is
   live.

Not scoped further than this — revisit when ready to connect real ad
accounts.
