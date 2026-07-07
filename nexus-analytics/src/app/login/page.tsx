"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter both your email and password.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    router.push(searchParams.get("next") || "/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-primary text-on-primary p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <Link href="/" className="relative z-10 flex items-center gap-3 w-fit">
          <div className="w-10 h-10 rounded-lg bg-on-primary/15 flex items-center justify-center">
            <Icon name="analytics" fill className="text-[24px]" />
          </div>
          <div>
            <h1 className="text-headline-md font-black tracking-tight">Nexus Analytics</h1>
            <p className="text-label-caps uppercase tracking-wider opacity-80">Enterprise Edition</p>
          </div>
        </Link>

        <div className="relative z-10">
          <h2 className="text-headline-lg font-semibold mb-3 max-w-sm">
            AI-powered marketing intelligence, in one workspace.
          </h2>
          <p className="text-body-md opacity-80 max-w-sm">
            Campaign performance, forecasting and recommendations across every platform you run.
          </p>
        </div>

        <p className="relative z-10 text-label-md opacity-70">© {2026} Nexus Analytics · Enterprise Edition</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden flex items-center gap-3 mb-8 w-fit">
            <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <Icon name="analytics" fill className="text-[22px]" />
            </div>
            <span className="text-headline-md font-black text-primary">Nexus Analytics</span>
          </Link>

          <h2 className="text-headline-lg text-on-surface mb-1">Sign in</h2>
          <p className="text-body-md text-on-surface-variant mb-8">Welcome back — enter your details to continue.</p>

          {error && (
            <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 mb-5 text-body-sm">
              <Icon name="error" className="text-[18px] mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-label-md text-on-surface-variant mb-1.5">
                Email
              </label>
              <div className="relative">
                <Icon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-label-md text-on-surface-variant">
                  Password
                </label>
                <a href="#" className="text-label-md text-primary hover:underline">
                  Forgot password?
                </a>
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

            <button
              type="submit"
              disabled={submitting}
              className={clsx(
                "w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-lg text-label-md font-semibold shadow-sm transition-colors",
                submitting ? "opacity-70 cursor-wait" : "hover:bg-surface-tint",
              )}
            >
              {submitting ? "Signing in…" : "Sign in"}
              {!submitting && <Icon name="arrow_forward" className="text-[18px]" />}
            </button>
          </form>

          <p className="mt-6 text-body-sm text-on-surface-variant text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
