"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";

const EIGHT_HOURS = 60 * 60 * 8;
const SIX_MONTHS = 60 * 60 * 24 * 180;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const HIGHLIGHTS = [
  { icon: "shield_lock", text: "Role-based access control for every workspace" },
  { icon: "verified_user", text: "SSO & MFA ready for enterprise teams" },
  { icon: "history", text: "Full audit trail of administrative actions" },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter both your email and password.");
      return;
    }

    setSubmitting(true);
    // Session cookie lifetime follows "Keep me signed in" — unchecked expires the
    // session after 8 hours instead of the usual 180-day persistent cookie.
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookieOptions: { maxAge: keepSignedIn ? SIX_MONTHS : EIGHT_HOURS } },
    );
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("This account doesn't have administrator access.");
      setSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-primary text-on-primary p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-on-primary/15 flex items-center justify-center">
            <Icon name="analytics" fill className="text-[24px]" />
          </div>
          <div>
            <h1 className="text-headline-md font-black tracking-tight">Nexus Analytics</h1>
            <p className="text-label-caps uppercase tracking-wider opacity-80">Admin Console</p>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-headline-lg font-semibold mb-3 max-w-sm">
            Administer access, integrations and platform health.
          </h2>
          <p className="text-body-md opacity-80 mb-8 max-w-sm">
            A secure control plane for managing users, credentials and data sources
            across your marketing intelligence workspace.
          </p>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-body-sm">
                <span className="w-8 h-8 rounded-full bg-on-primary/15 flex items-center justify-center shrink-0">
                  <Icon name={h.icon} className="text-[18px]" />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-label-md opacity-70">
          © {2026} Nexus Analytics · Enterprise Edition
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <Icon name="admin_panel_settings" fill className="text-[22px]" />
            </div>
            <span className="text-headline-md font-black text-primary">Nexus Admin</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container/40 text-on-error-container text-label-caps uppercase tracking-wider mb-4">
            <Icon name="shield" className="text-[14px]" /> Restricted Access
          </div>
          <h2 className="text-headline-lg text-on-surface mb-1">Admin sign in</h2>
          <p className="text-body-md text-on-surface-variant mb-8">
            Use your administrator credentials to access the console.
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 mb-5 text-body-sm">
              <Icon name="error" className="text-[18px] mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-label-md text-on-surface-variant mb-1.5">
                Work email
              </label>
              <div className="relative">
                <Icon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nexus.co"
                  className="w-full pl-10 pr-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-label-md text-on-surface-variant">
                  Password
                </label>
                <Link href="/forgot-password" className="text-label-md text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Icon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[18px]" />
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-body-sm text-on-surface-variant select-none">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="rounded border-outline-variant text-primary focus:ring-primary"
              />
              Keep me signed in on this device
            </label>

            <button
              type="submit"
              disabled={submitting}
              className={clsx(
                "w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-lg text-label-md font-semibold shadow-sm transition-colors",
                submitting ? "opacity-70 cursor-wait" : "hover:bg-surface-tint",
              )}
            >
              {submitting ? "Signing in…" : "Sign in to console"}
              {!submitting && <Icon name="arrow_forward" className="text-[18px]" />}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-label-md text-on-surface-variant">
            <span className="flex-1 h-px bg-outline-variant/50" />
            secured area
            <span className="flex-1 h-px bg-outline-variant/50" />
          </div>

          <p className="mt-6 text-body-sm text-on-surface-variant text-center">
            Not an administrator?{" "}
            <a href={`${APP_URL}/dashboard`} className="text-primary hover:underline">
              Return to the workspace
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
