"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "member";
  created_at: string;
};

function initials(name: string | null, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email[0]?.toUpperCase() ?? "?";
}

export function ProfilePanel() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setProfile(null); return; }

      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, email, full_name, role, created_at")
        .eq("id", userData.user.id)
        .single();

      if (fetchError || !data) {
        setError("Failed to load your profile.");
        setProfile(null);
        return;
      }
      setProfile(data);
      setFullName(data.full_name ?? "");
    })();
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("users")
      .update({ full_name: fullName.trim() })
      .eq("id", profile.id);

    setSaving(false);
    if (updateError) {
      setError("Failed to save changes.");
      return;
    }
    setProfile({ ...profile, full_name: fullName.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (profile === undefined) {
    return (
      <Card className="p-card-padding">
        <p className="text-body-sm text-on-surface-variant py-6 text-center">Loading profile…</p>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="p-card-padding">
        <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 text-body-sm">
          <Icon name="error" className="text-[18px] mt-0.5" />
          <span>{error ?? "Your session has expired. Please sign in again."}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-card-padding">
      <CardHeader title="Profile" icon="person" />

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-headline-md font-bold shrink-0">
          {initials(profile.full_name, profile.email)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-body-md font-semibold text-on-surface">
              {profile.full_name || "Unnamed user"}
            </span>
            <Badge tone={profile.role === "admin" ? "primary" : "neutral"}>{profile.role}</Badge>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Member since {new Date(profile.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      <div className="grid gap-5 max-w-md">
        <div>
          <label className="block text-label-md text-on-surface-variant mb-1.5">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-label-md text-on-surface-variant mb-1.5">Email</label>
          <input
            value={profile.email}
            disabled
            className="w-full px-3.5 py-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-body-sm text-on-surface-variant cursor-not-allowed"
          />
        </div>

        {error && <p className="text-body-sm text-error">{error}</p>}

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleSave} disabled={saving || fullName.trim() === (profile.full_name ?? "")}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-body-sm text-tertiary">
              <Icon name="check_circle" className="text-[16px]" /> Saved
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
