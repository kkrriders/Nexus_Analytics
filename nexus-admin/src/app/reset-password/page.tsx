"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center">
            <Icon name="admin_panel_settings" fill className="text-[22px]" />
          </div>
          <span className="text-headline-md font-black text-primary">Nexus Admin</span>
        </div>

        {done ? (
          <div className="bg-surface-bright border border-outline-variant rounded-lg p-6 text-center">
            <Icon name="check_circle" className="text-[40px] text-tertiary mb-3" />
            <h2 className="text-headline-md text-on-surface mb-1">Password updated</h2>
            <p className="text-body-md text-on-surface-variant">Taking you to the console…</p>
          </div>
        ) : !ready ? (
          <div className="bg-surface-bright border border-outline-variant rounded-lg p-6 text-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-body-md text-on-surface-variant">Verifying reset link…</p>
          </div>
        ) : (
          <>
            <h2 className="text-headline-lg text-on-surface mb-1">Set a new password</h2>
            <p className="text-body-md text-on-surface-variant mb-8">Choose a new password for your admin account.</p>

            {error && (
              <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 mb-5 text-body-sm">
                <Icon name="error" className="text-[18px] mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="password" className="block text-label-md text-on-surface-variant mb-1.5">New password</label>
                <div className="relative">
                  <Icon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
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

              <div>
                <label htmlFor="confirmPassword" className="block text-label-md text-on-surface-variant mb-1.5">Confirm password</label>
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
                {submitting ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
