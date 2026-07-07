"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { isPasswordPwned } from "@/lib/pwnedPassword";

export function SecurityPanel() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleChangePassword() {
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }

    setSaving(true);
    if (await isPasswordPwned(newPassword)) {
      setError("This password has appeared in a known data breach. Please choose a different one.");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (updateError) { setError(updateError.message); return; }
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function handleSignOutEverywhere() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-card-padding">
        <CardHeader title="Change Password" icon="lock" />

        <div className="grid gap-5 max-w-md">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                className="w-full pl-3.5 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
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
            <label className="block text-label-md text-on-surface-variant mb-1.5">Confirm new password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 text-body-sm">
              <Icon name="error" className="text-[18px] mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={handleChangePassword} disabled={saving || !newPassword || !confirmPassword}>
              {saving ? "Updating…" : "Update password"}
            </Button>
            {success && (
              <span className="flex items-center gap-1 text-body-sm text-tertiary">
                <Icon name="check_circle" className="text-[16px]" /> Password updated
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-card-padding">
        <CardHeader title="Active Sessions" icon="devices" />
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-body-sm text-on-surface-variant max-w-md">
            Sign out of Nexus Analytics on every device where you&apos;re currently logged in, including this one.
          </p>
          <Button variant="danger" icon="logout" onClick={handleSignOutEverywhere} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out all sessions"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
