"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-3 mb-8 w-fit">
          <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center">
            <Icon name="analytics" fill className="text-[22px]" />
          </div>
          <span className="text-headline-md font-black text-primary">Nexus Analytics</span>
        </Link>

        {sent ? (
          <div className="bg-surface-bright border border-outline-variant rounded-lg p-6 text-center">
            <Icon name="mark_email_read" className="text-[40px] text-tertiary mb-3" />
            <h2 className="text-headline-md text-on-surface mb-1">Check your email</h2>
            <p className="text-body-md text-on-surface-variant">
              If an account exists for <span className="font-medium text-on-surface">{email}</span>, we&apos;ve sent a link to reset your password.
            </p>
            <Link href="/login" className="inline-block mt-6 text-primary hover:underline text-body-sm">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-headline-lg text-on-surface mb-1">Reset your password</h2>
            <p className="text-body-md text-on-surface-variant mb-8">
              Enter the email associated with your account and we&apos;ll send a link to reset your password.
            </p>

            {error && (
              <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 mb-5 text-body-sm">
                <Icon name="error" className="text-[18px] mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="block text-label-md text-on-surface-variant mb-1.5">Email</label>
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

              <button
                type="submit"
                disabled={submitting}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-lg text-label-md font-semibold shadow-sm transition-colors",
                  submitting ? "opacity-70 cursor-wait" : "hover:bg-surface-tint",
                )}
              >
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-body-sm text-on-surface-variant text-center">
              Remembered it?{" "}
              <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
