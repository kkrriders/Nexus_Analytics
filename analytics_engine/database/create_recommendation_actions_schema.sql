-- Run this in the Supabase SQL editor (or via psql) after create_accounts_schema.sql.
-- Persists a user's approve/reject decision on an AI recommendation. Recommendation
-- ids are regenerated every 5-minute pipeline window (uuid suffix), so decisions are
-- keyed by (user_id, campaign_id, rec_type) instead of the ephemeral recommendation id —
-- that way a decision survives regeneration as long as the same campaign+issue recurs.

CREATE TABLE IF NOT EXISTS public.recommendation_actions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL,
    rec_type    TEXT NOT NULL,
    rec_title   TEXT NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, campaign_id, rec_type)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_actions_user ON public.recommendation_actions (user_id);

-- RLS: users manage their own decisions directly; the backend goes through the
-- FastAPI service using the service_role key, which bypasses RLS.
ALTER TABLE public.recommendation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recommendation actions" ON public.recommendation_actions;
CREATE POLICY "Users can view own recommendation actions" ON public.recommendation_actions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recommendation actions" ON public.recommendation_actions;
CREATE POLICY "Users can insert own recommendation actions" ON public.recommendation_actions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recommendation actions" ON public.recommendation_actions;
CREATE POLICY "Users can update own recommendation actions" ON public.recommendation_actions
    FOR UPDATE USING (auth.uid() = user_id);

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
