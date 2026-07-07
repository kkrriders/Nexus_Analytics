"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PlanKey } from "@/lib/plans";

const PLAN_LABEL: Record<PlanKey, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  both: "Google + Meta",
};

/* ─── Steps helper ────────────────────────────────────── */

function StepBar({ active }: { active: number }) {
  const steps = [
    { n: 1, label: "Plan" },
    { n: 2, label: "Payment" },
    { n: 3, label: "Connect" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {steps.map((step, i) => (
        <div key={step.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background:
                  step.n < active
                    ? "#10B981"
                    : step.n === active
                    ? "#4F46E5"
                    : "#E2E8F0",
                color: step.n <= active ? "#fff" : "#94A3B8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {step.n < active ? "✓" : step.n}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: step.n === active ? 700 : 500,
                color:
                  step.n < active
                    ? "#10B981"
                    : step.n === active
                    ? "#0F172A"
                    : "#94A3B8",
              }}
            >
              {step.label}
            </span>
          </div>
          {i < 2 && (
            <div
              style={{
                width: 28,
                height: 1,
                background: step.n < active ? "#10B981" : "#E2E8F0",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── API Key Field ───────────────────────────────────── */

function ApiKeyField({
  label,
  sublabel,
  placeholder,
  value,
  error,
  onChange,
  helpSteps,
  docsUrl,
  iconColor,
  iconLetter,
  extraField,
}: {
  label: string;
  sublabel: string;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  helpSteps: string[];
  docsUrl: string;
  iconColor: string;
  iconLetter: string;
  extraField?: {
    label: string;
    placeholder: string;
    value: string;
    error?: string;
    onChange: (v: string) => void;
  };
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [showKey, setShowKey] = useState(false);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #E2E8F0",
        padding: 28,
        boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: iconLetter.length > 1 ? 14 : 20,
          }}
        >
          {iconLetter}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#0F172A" }}>{label}</div>
          <div style={{ fontSize: 13, color: "#475569" }}>{sublabel}</div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            background: "#F0FDF4",
            color: "#10B981",
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 100,
            border: "1px solid #BBF7D0",
          }}
        >
          Required
        </div>
      </div>

      {/* Input */}
      <div style={{ marginBottom: error ? 6 : 16 }}>
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#0F172A",
            display: "block",
            marginBottom: 6,
          }}
        >
          API Key / Access Token
        </label>
        <div style={{ position: "relative" }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 16,
              color: "#94A3B8",
            }}
          >
            key
          </span>
          <input
            type={showKey ? "text" : "password"}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 44px 12px 38px",
              borderRadius: 10,
              border: `1.5px solid ${error ? "#EF4444" : value ? "#10B981" : "#E2E8F0"}`,
              fontSize: 14,
              color: "#0F172A",
              background: "#fff",
              fontFamily: "var(--font-mono)",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#94A3B8" }}>
              {showKey ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
        {error && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{error}</p>}
        {value && !error && (
          <p style={{ fontSize: 12, color: "#10B981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
            API key entered
          </p>
        )}
      </div>

      {extraField && (
        <div style={{ marginBottom: extraField.error ? 6 : 16 }}>
          <label
            style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", display: "block", marginBottom: 6 }}
          >
            {extraField.label}
          </label>
          <input
            type="text"
            placeholder={extraField.placeholder}
            value={extraField.value}
            onChange={(e) => extraField.onChange(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1.5px solid ${extraField.error ? "#EF4444" : extraField.value ? "#10B981" : "#E2E8F0"}`,
              fontSize: 14,
              color: "#0F172A",
              background: "#fff",
              fontFamily: "var(--font-mono)",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
          />
          {extraField.error && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{extraField.error}</p>}
        </div>
      )}

      {/* How to get key */}
      <button
        type="button"
        onClick={() => setShowHelp((s) => !s)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "#4F46E5",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          fontFamily: "var(--font-sans)",
          marginBottom: showHelp ? 14 : 0,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>help_outline</span>
        How to get your {label} API key
        <span className="material-symbols-outlined" style={{ fontSize: 14, transition: "transform 0.2s", transform: showHelp ? "rotate(180deg)" : "none" }}>
          expand_more
        </span>
      </button>

      {showHelp && (
        <div
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            padding: 16,
          }}
        >
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {helpSteps.map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                {step}
              </li>
            ))}
          </ol>
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 12,
              fontSize: 12,
              color: "#4F46E5",
              fontWeight: 600,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
            View official documentation
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────── */

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupPageInner />
    </Suspense>
  );
}

function SetupPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planKey = (searchParams.get("plan") ?? "google") as PlanKey;

  const showGoogle = planKey === "google" || planKey === "both";
  const showMeta = planKey === "meta" || planKey === "both";

  const [googleKey, setGoogleKey] = useState("");
  const [metaKey, setMetaKey] = useState("");
  const [metaAccountId, setMetaAccountId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  async function handleComplete() {
    const errs: Record<string, string> = {};
    if (showGoogle && !googleKey.trim()) errs.google = "Google Ads API key is required";
    if (showMeta && !metaKey.trim()) errs.meta = "Meta Ads Access Token is required";
    if (showMeta && !metaAccountId.trim()) errs.metaAccountId = "Meta Ads Account ID is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaveError(null);
    setSaving(true);

    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setSaving(false);
      setSaveError("Your session has expired — please sign in, then reconnect your ad accounts from Settings.");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/accounts/connect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          google_ads_developer_token: showGoogle ? googleKey.trim() : undefined,
          meta_ads_access_token: showMeta ? metaKey.trim() : undefined,
          meta_ads_account_id: showMeta ? metaAccountId.trim() : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail ?? "Failed to save your ad account credentials.");
      router.push("/dashboard");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save your ad account credentials.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "var(--font-sans)" }}>
      {/* Top bar */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #E2E8F0",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 7,
              background: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 16,
              color: "#fff",
            }}
          >
            N
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>Nexus Analytics</span>
        </div>

        <StepBar active={3} />

        <Link
          href={`/checkout?plan=${planKey}`}
          style={{ fontSize: 13, color: "#475569", textDecoration: "none" }}
        >
          ← Back to Payment
        </Link>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 720, margin: "48px auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: 100,
              padding: "6px 16px",
              marginBottom: 16,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#10B981" }}>
              check_circle
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#065F46" }}>
              Payment successful — Step 3 of 3
            </span>
          </div>

          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-0.8px",
              marginBottom: 10,
            }}
          >
            Connect your ad accounts
          </h1>
          <p style={{ fontSize: 15, color: "#475569", maxWidth: 480, margin: "0 auto" }}>
            You&apos;re subscribed to the{" "}
            <strong style={{ color: "#4F46E5" }}>{PLAN_LABEL[planKey]}</strong> plan.
            {planKey === "both"
              ? " Add both API keys to unlock the full cross-platform dashboard."
              : " Add your API key below to start pulling live data."}
          </p>
        </div>

        {/* API key cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
          {showGoogle && (
            <ApiKeyField
              label="Google Ads"
              sublabel="Connect your Google Ads account via API"
              placeholder="Enter your Google Ads Developer Token"
              value={googleKey}
              error={errors.google}
              onChange={(v) => { setGoogleKey(v); setErrors((e) => ({ ...e, google: "" })); }}
              iconColor="#4285F4"
              iconLetter="G"
              helpSteps={[
                "Sign in to your Google Ads account at ads.google.com",
                "Click the Tools icon (wrench) in the top right navigation",
                "Under 'Setup', click on 'API Center'",
                "Apply for API access if not already approved — approval is usually instant for verified accounts",
                "Copy your Developer Token from the API Center page",
                "Paste it in the field above",
              ]}
              docsUrl="https://developers.google.com/google-ads/api/docs/get-started/dev-token"
            />
          )}

          {showMeta && (
            <ApiKeyField
              label="Meta Ads"
              sublabel="Connect your Meta Business account via API"
              placeholder="Enter your Meta Ads Access Token"
              value={metaKey}
              error={errors.meta}
              onChange={(v) => { setMetaKey(v); setErrors((e) => ({ ...e, meta: "" })); }}
              iconColor="#0866FF"
              iconLetter="M"
              helpSteps={[
                "Go to developers.facebook.com and log in with your Meta account",
                "Navigate to 'My Apps' and select your app (or create a new one)",
                "Under 'Tools', open the 'Graph API Explorer'",
                "Click 'Generate Access Token' and select your Ad Account permissions",
                "For production use, generate a long-lived token via the Access Token Debugger",
                "Copy the token and paste it in the field above",
              ]}
              docsUrl="https://developers.facebook.com/docs/marketing-api/overview/authorization"
              extraField={{
                label: "Ad Account ID",
                placeholder: "e.g. 1234567890 (found in Business Settings → Ad Accounts)",
                value: metaAccountId,
                error: errors.metaAccountId,
                onChange: (v) => { setMetaAccountId(v); setErrors((e) => ({ ...e, metaAccountId: "" })); },
              }}
            />
          )}
        </div>

        {saveError && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 12,
              padding: 14,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#EF4444", flexShrink: 0, marginTop: 1 }}>
              error
            </span>
            <p style={{ fontSize: 13, color: "#B91C1C" }}>{saveError}</p>
          </div>
        )}

        {/* Info notice */}
        <div
          style={{
            background: "#EEF2FF",
            border: "1px solid #C7D2FE",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 28,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#4F46E5", flexShrink: 0, marginTop: 1 }}>
            shield
          </span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#3730A3", marginBottom: 2 }}>
              Your API keys are stored securely
            </p>
            <p style={{ fontSize: 12, color: "#4338CA", lineHeight: 1.5 }}>
              Keys are encrypted at rest using AES-256. We only request read-only scopes —
              Nexus Analytics never modifies your campaigns without explicit approval. You can
              revoke access anytime from your account settings.
            </p>
          </div>
        </div>

        {/* Complete button */}
        <button
          onClick={handleComplete}
          disabled={saving}
          style={{
            width: "100%",
            padding: "15px 0",
            borderRadius: 12,
            border: "none",
            background: saving ? "#818CF8" : "#4F46E5",
            color: "#fff",
            fontWeight: 700,
            fontSize: 16,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "var(--font-sans)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            boxShadow: "0 4px 16px rgba(79,70,229,0.35)",
          }}
        >
          {saving ? (
            <>
              <span
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Connecting accounts...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                rocket_launch
              </span>
              Complete Setup & Go to Dashboard
            </>
          )}
        </button>

        <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#94A3B8" }}>
          You can update or add API keys anytime from{" "}
          <Link href="/settings" style={{ color: "#4F46E5" }}>
            Settings → Integrations
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
