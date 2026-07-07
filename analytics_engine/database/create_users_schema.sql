-- Run this in the Supabase SQL editor (or via psql) to set up user profiles.
-- Supabase Auth (auth.users) handles credentials/signup/login/password reset.
-- public.users is a profile table keyed to auth.users(id) for app-specific fields.

DROP TABLE IF EXISTS public.users;

CREATE TABLE public.users (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email         TEXT NOT NULL UNIQUE,
    full_name     TEXT,
    role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_active     BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON public.users (email);

-- Auto-create a profile row whenever someone signs up through Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pin search_path (prevents search_path-hijacking of this SECURITY DEFINER
-- function) and revoke EXECUTE from anon/authenticated/PUBLIC so it can't be
-- called directly via /rest/v1/rpc/handle_new_auth_user — it should only ever
-- run as the auth.users trigger, which doesn't require an EXECUTE grant.
ALTER FUNCTION public.handle_new_auth_user() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- RLS: users can read/update their own profile row. Admin-wide access (e.g. the
-- admin console's user list) goes through the FastAPI backend using the
-- service_role key, which bypasses RLS entirely.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Column-level grant: RLS above restricts which ROW a user can update (their
-- own), but says nothing about which COLUMNS — without this, any signed-up
-- user could PATCH their own `role` to 'admin' directly via Supabase's REST
-- API using just the public anon key. Restrict self-service updates to
-- full_name only; role/is_active must only ever change through the FastAPI
-- admin endpoint, which uses the service_role key and bypasses RLS/grants.
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (full_name) ON public.users TO authenticated;

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
