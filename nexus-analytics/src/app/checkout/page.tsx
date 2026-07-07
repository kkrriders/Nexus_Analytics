"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PLANS, type PlanKey } from "@/lib/plans";

/* ─── Payment method tabs ─────────────────────────────── */

const METHODS = [
  { id: "card", label: "Card", icon: "credit_card" },
  { id: "upi", label: "UPI", icon: "qr_code" },
  { id: "netbanking", label: "Net Banking", icon: "account_balance" },
];

/* ─── Page ────────────────────────────────────────────── */

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planKey = (searchParams.get("plan") ?? "google") as PlanKey;
  const plan = PLANS[planKey] ?? PLANS.google;

  const [method, setMethod] = useState("card");
  const [form, setForm] = useState({
    name: "",
    card: "",
    expiry: "",
    cvv: "",
    upi: "",
    bank: "",
  });
  const [paying, setPaying] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function formatCard(val: string) {
    return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (method === "card") {
      if (!form.name.trim()) errs.name = "Cardholder name is required";
      if (form.card.replace(/\s/g, "").length < 16) errs.card = "Enter a valid 16-digit card number";
      if (form.expiry.length < 5) errs.expiry = "Enter valid expiry (MM/YY)";
      if (form.cvv.length < 3) errs.cvv = "Enter valid CVV";
    } else if (method === "upi") {
      if (!form.upi.includes("@")) errs.upi = "Enter a valid UPI ID (e.g. name@upi)";
    } else {
      if (!form.bank) errs.bank = "Please select a bank";
    }
    return errs;
  }

  function handlePay() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      router.push(`/setup?plan=${planKey}`);
    }, 1800);
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

        {/* Steps */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[
            { n: 1, label: "Plan" },
            { n: 2, label: "Payment" },
            { n: 3, label: "Connect" },
          ].map((step, i) => (
            <div key={step.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: step.n === 1 ? "#10B981" : step.n === 2 ? "#4F46E5" : "#E2E8F0",
                    color: step.n <= 2 ? "#fff" : "#94A3B8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {step.n === 1 ? "✓" : step.n}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: step.n === 2 ? 700 : 500,
                    color: step.n === 2 ? "#0F172A" : step.n === 1 ? "#10B981" : "#94A3B8",
                  }}
                >
                  {step.label}
                </span>
              </div>
              {i < 2 && (
                <div style={{ width: 28, height: 1, background: i === 0 ? "#10B981" : "#E2E8F0" }} />
              )}
            </div>
          ))}
        </div>

        <Link href="/" style={{ fontSize: 13, color: "#475569", textDecoration: "none" }}>
          ← Back to Plans
        </Link>
      </div>

      {/* Body */}
      <div
        style={{
          maxWidth: 1000,
          margin: "48px auto",
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* LEFT — Payment form */}
        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            border: "1px solid #E2E8F0",
            padding: 36,
            boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 6 }}>
            Complete your payment
          </h1>
          <p style={{ fontSize: 14, color: "#475569", marginBottom: 28 }}>
            Secure checkout — 256-bit SSL encryption
          </p>

          {/* Method tabs */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 28,
              borderBottom: "1px solid #E2E8F0",
              paddingBottom: 0,
            }}
          >
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 18px",
                  borderRadius: "10px 10px 0 0",
                  border: "none",
                  borderBottom: method === m.id ? "2px solid #4F46E5" : "2px solid transparent",
                  background: method === m.id ? "#EEF2FF" : "transparent",
                  color: method === m.id ? "#4F46E5" : "#475569",
                  fontWeight: method === m.id ? 700 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {m.icon}
                </span>
                {m.label}
              </button>
            ))}
          </div>

          {/* Card form */}
          {method === "card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Field
                label="Cardholder Name"
                placeholder="Name as on card"
                value={form.name}
                error={errors.name}
                onChange={(v) => set("name", v)}
              />
              <Field
                label="Card Number"
                placeholder="1234 5678 9012 3456"
                value={form.card}
                error={errors.card}
                onChange={(v) => set("card", formatCard(v))}
                icon="credit_card"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field
                  label="Expiry Date"
                  placeholder="MM/YY"
                  value={form.expiry}
                  error={errors.expiry}
                  onChange={(v) => set("expiry", formatExpiry(v))}
                />
                <Field
                  label="CVV"
                  placeholder="•••"
                  value={form.cvv}
                  error={errors.cvv}
                  onChange={(v) => set("cvv", v.replace(/\D/g, "").slice(0, 4))}
                  type="password"
                />
              </div>

              {/* Card logos */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#94A3B8" }}>Accepted:</span>
                {["Visa", "MC", "Rupay", "Amex"].map((c) => (
                  <div
                    key={c}
                    style={{
                      padding: "3px 8px",
                      border: "1px solid #E2E8F0",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#475569",
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UPI form */}
          {method === "upi" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Field
                label="UPI ID"
                placeholder="yourname@paytm / @gpay / @upi"
                value={form.upi}
                error={errors.upi}
                onChange={(v) => set("upi", v)}
                icon="qr_code"
              />
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 10,
                  padding: 14,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#10B981", flexShrink: 0 }}>
                  info
                </span>
                <p style={{ fontSize: 13, color: "#065F46" }}>
                  Enter your UPI ID and we&apos;ll send a payment request to your UPI app. Works with PhonePe, GPay, Paytm, BHIM and all UPI-enabled apps.
                </p>
              </div>
              <UpiLogos />
            </div>
          )}

          {/* Net Banking form */}
          {method === "netbanking" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", display: "block", marginBottom: 6 }}>
                  Select Bank
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  {["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank"].map((b) => (
                    <button
                      key={b}
                      onClick={() => set("bank", b)}
                      style={{
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: `1.5px solid ${form.bank === b ? "#4F46E5" : "#E2E8F0"}`,
                        background: form.bank === b ? "#EEF2FF" : "#fff",
                        color: form.bank === b ? "#4F46E5" : "#0F172A",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                        textAlign: "left",
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <select
                  value={form.bank}
                  onChange={(e) => set("bank", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: `1.5px solid ${errors.bank ? "#EF4444" : "#E2E8F0"}`,
                    background: "#fff",
                    fontSize: 14,
                    color: form.bank ? "#0F172A" : "#94A3B8",
                    fontFamily: "var(--font-sans)",
                    outline: "none",
                  }}
                >
                  <option value="">-- Or choose another bank --</option>
                  {["Kotak Mahindra", "Yes Bank", "IDFC First", "Punjab National Bank", "Bank of Baroda", "Canara Bank", "IndusInd Bank"].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {errors.bank && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.bank}</p>}
              </div>
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={paying}
            style={{
              marginTop: 28,
              width: "100%",
              padding: "15px 0",
              borderRadius: 12,
              border: "none",
              background: paying ? "#818CF8" : "#4F46E5",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              cursor: paying ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: "0 4px 16px rgba(79,70,229,0.35)",
              transition: "all 0.2s",
            }}
          >
            {paying ? (
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
                Processing payment...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>lock</span>
                Pay Rs{plan.price.toLocaleString("en-IN")} / month
              </>
            )}
          </button>

          <p style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "#94A3B8" }}>
            By proceeding you agree to our{" "}
            <a href="#" style={{ color: "#4F46E5" }}>Terms of Service</a> and{" "}
            <a href="#" style={{ color: "#4F46E5" }}>Privacy Policy</a>. Cancel anytime.
          </p>
        </div>

        {/* RIGHT — Order summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              border: "1px solid #E2E8F0",
              padding: 28,
              boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 20 }}>
              Order Summary
            </h2>

            {/* Plan card */}
            <div
              style={{
                background: plan.bg,
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                border: `1px solid ${plan.color}22`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: plan.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {plan.letter}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{plan.name}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{plan.subtitle}</div>
                </div>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.summaryFeatures.map((f) => (
                  <li
                    key={f}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#10B981" }}>
                      check_circle
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Price breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <Row label="Monthly plan" value={`Rs${plan.price.toLocaleString("en-IN")}`} />
              <Row label="Setup fee" value="Free" valueColor="#10B981" />
              <Row label="GST (18%)" value={`Rs${Math.round(plan.price * 0.18).toLocaleString("en-IN")}`} />
            </div>

            <div
              style={{
                borderTop: "1px solid #E2E8F0",
                paddingTop: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>Total today</span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 20,
                  color: "#4F46E5",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Rs{Math.round(plan.price * 1.18).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Security badges */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              padding: 18,
            }}
          >
            {[
              { icon: "verified_user", label: "256-bit SSL encryption" },
              { icon: "security", label: "PCI DSS Level 1 certified" },
              { icon: "autorenew", label: "Cancel anytime, no lock-in" },
            ].map((b) => (
              <div
                key={b.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#10B981" }}>
                  {b.icon}
                </span>
                <span style={{ fontSize: 12, color: "#475569" }}>{b.label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#10B981" }}>support_agent</span>
              <span style={{ fontSize: 12, color: "#475569" }}>24/7 customer support</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function Field({
  label,
  placeholder,
  value,
  error,
  onChange,
  icon,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  icon?: string;
  type?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {icon && (
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
            {icon}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: icon ? "11px 14px 11px 38px" : "11px 14px",
            borderRadius: 10,
            border: `1.5px solid ${error ? "#EF4444" : "#E2E8F0"}`,
            fontSize: 14,
            color: "#0F172A",
            background: "#fff",
            fontFamily: "var(--font-sans)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      {error && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  valueColor = "#0F172A",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );
}

function UpiLogos() {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {["GPay", "PhonePe", "Paytm", "BHIM"].map((u) => (
        <div
          key={u}
          style={{
            padding: "6px 12px",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            background: "#fff",
          }}
        >
          {u}
        </div>
      ))}
    </div>
  );
}
