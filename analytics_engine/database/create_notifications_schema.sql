-- Run this in the Supabase SQL editor (or via psql) after create_accounts_schema.sql.
-- Real notifications for both the user dashboard bell (nexus-analytics) and the
-- admin console bell (nexus-admin). User notifications are scoped to one user_id;
-- admin notifications are broadcast (user_id NULL, audience 'admin') since every
-- admin should see them. scope_key exists purely so a partial unique index can
-- dedupe noisy/repeating events (e.g. the same sync failure every 5 minutes)
-- without fighting NULL user_id semantics in a plain (user_id, dedup_key) index.

CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    scope_key  TEXT NOT NULL,       -- user_id as text for user notifications, or 'admin'
    audience   TEXT NOT NULL DEFAULT 'user' CHECK (audience IN ('user', 'admin')),
    level      TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warning', 'critical')),
    title      TEXT NOT NULL,
    body       TEXT,
    link       TEXT,
    dedup_key  TEXT,
    read       BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup
    ON public.notifications (scope_key, dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_scope_created
    ON public.notifications (scope_key, created_at DESC);

-- RLS: users read/update their own notifications directly; the backend goes
-- through the FastAPI service using the service_role key, which bypasses RLS
-- (needed for admin broadcast rows, which have no single owning user_id).
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Broadcast an admin notification whenever a new user profile is created
-- (public.users already has an on_auth_user_created trigger populating it —
-- this just piggybacks on that same insert).
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, scope_key, audience, level, title, body, link)
    VALUES (NULL, 'admin', 'admin', 'info', 'New user signed up', NEW.email, '/users');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.notify_admin_new_user() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.notify_admin_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_admin_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_admin_new_user() FROM authenticated;

DROP TRIGGER IF EXISTS on_user_profile_created ON public.users;
CREATE TRIGGER on_user_profile_created
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_user();

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
