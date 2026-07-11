-- Run this in the Supabase SQL editor (or via psql) after create_users_schema.sql.
-- Adds per-user notification preferences, read/written by the FastAPI backend
-- (service-role Postgres connection — no RLS/grant changes needed here).

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL
    DEFAULT '{"criticalAlerts": true, "weeklySummary": true, "aiDigest": true, "productUpdates": false}'::jsonb;
