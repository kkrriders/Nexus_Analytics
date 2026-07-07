"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { createClient } from "@/lib/supabase/client";
import { isPasswordPwned } from "@/lib/pwnedPassword";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in every field.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    if (await isPasswordPwned(password)) {
      setError("This password has appeared in a known data breach. Please choose a different one.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setCheckEmail(true);
    setSubmitting(false);
  };

  if (checkEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
            <Icon name="mark_email_read" className="text-[28px]" />
          </div>
          <h2 className="text-headline-lg text-on-surface mb-2">Check your email</h2>
          <p className="text-body-md text-on-surface-variant mb-8">
            We sent a confirmation link to <strong>{email}</strong>. Confirm your address to finish creating your
            account.
          </p>
          <Link href="/login" className="text-primary hover:underline text-label-md">
            Return to sign in
          </Link>
        </div>
      </div>
    );
  }

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
            Set up your workspace in minutes.
          </h2>
          <p className="text-body-md opacity-80 max-w-sm">
            Connect your ad platforms and let the AI engine start scoring campaign health from day one.
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

          <h2 className="text-headline-lg text-on-surface mb-1">Create your account</h2>
          <p className="text-body-md text-on-surface-variant mb-8">Start your enterprise workspace.</p>

          {error && (
            <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 mb-5 text-body-sm">
              <Icon name="error" className="text-[18px] mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="fullName" className="block text-label-md text-on-surface-variant mb-1.5">
                Full name
              </label>
              <div className="relative">
                <Icon name="person" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full pl-10 pr-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

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
              <label htmlFor="password" className="block text-label-md text-on-surface-variant mb-1.5">
                Password
              </label>
              <div className="relative">
                <Icon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-label-md text-on-surface-variant mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Icon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
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
              {submitting ? "Creating account…" : "Create account"}
              {!submitting && <Icon name="arrow_forward" className="text-[18px]" />}
            </button>
          </form>

          <p className="mt-6 text-body-sm text-on-surface-variant text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
