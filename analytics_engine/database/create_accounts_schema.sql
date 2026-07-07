-- Run this in the Supabase SQL editor (or via psql) after create_users_schema.sql.
-- Stores per-user ad platform credentials collected at /setup, and the
-- connection/sync state that n8n workflows (nexus_n8n_workflow.json,
-- nexus_n8n_token_refresh.json) read from and write back to.

CREATE TABLE IF NOT EXISTS public.accounts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    plan                 TEXT NOT NULL DEFAULT 'google' CHECK (plan IN ('google', 'meta', 'both')),
    google_ads           JSONB NOT NULL DEFAULT '{}'::jsonb,
    meta_ads             JSONB NOT NULL DEFAULT '{}'::jsonb,
    subscription_status  TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled')),
    stripe_customer_id   TEXT,
    last_synced_at       TIMESTAMPTZ,
    last_sync_error      TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_subscription_status ON public.accounts (subscription_status);
CREATE INDEX IF NOT EXISTS idx_accounts_stripe_customer_id ON public.accounts (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- RLS: users manage their own account row directly; n8n and the admin console
-- go through the FastAPI backend using the service_role key, which bypasses RLS.
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own account" ON public.accounts;
CREATE POLICY "Users can view own account" ON public.accounts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own account" ON public.accounts;
CREATE POLICY "Users can update own account" ON public.accounts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own account" ON public.accounts;
CREATE POLICY "Users can insert own account" ON public.accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
