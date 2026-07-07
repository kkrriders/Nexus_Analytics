"use client";

import Link from "next/link";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

/* ─── Steps helper ────────────────────────────────────── */

function StepBar() {
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
                background: step.n === 1 ? "#4F46E5" : "#E2E8F0",
                color: step.n === 1 ? "#fff" : "#94A3B8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {step.n}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: step.n === 1 ? 700 : 500,
                color: step.n === 1 ? "#0F172A" : "#94A3B8",
              }}
            >
              {step.label}
            </span>
          </div>
          {i < 2 && <div style={{ width: 28, height: 1, background: "#E2E8F0" }} />}
        </div>
      ))}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────── */

export default function PlansPage() {
  const order = PLAN_ORDER.map((k) => PLANS[k]);

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

        <StepBar />

        <Link href="/settings" style={{ fontSize: 13, color: "#475569", textDecoration: "none" }}>
          ← Back to Settings
        </Link>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "48px auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div
            style={{
              display: "inline-block",
              background: "#EEF2FF",
              color: "#4F46E5",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "6px 14px",
              borderRadius: 100,
              marginBottom: 16,
            }}
          >
            TRANSPARENT PRICING
          </div>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-0.8px",
              marginBottom: 12,
            }}
          >
            Choose a plan to connect your ad accounts
          </h1>
          <p style={{ fontSize: 15, color: "#475569", maxWidth: 480, margin: "0 auto" }}>
            Pick the platform you spend the most on. You can upgrade or switch plans anytime from Settings.
          </p>
        </div>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {order.map((plan) => {
            const isPopular = plan.popular;
            return (
              <div
                key={plan.key}
                style={{
                  background: isPopular ? "#4F46E5" : "#fff",
                  borderRadius: 20,
                  padding: 32,
                  border: isPopular ? "none" : "1.5px solid #E2E8F0",
                  boxShadow: isPopular
                    ? "0 20px 60px rgba(79,70,229,0.35), 0 4px 20px rgba(79,70,229,0.2)"
                    : "0 4px 20px rgba(15,23,42,0.06)",
                  position: "relative",
                  transform: isPopular ? "scale(1.04)" : "none",
                }}
              >
                {isPopular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -14,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#F59E0B",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      padding: "5px 18px",
                      borderRadius: 100,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ★ MOST POPULAR
                  </div>
                )}

                {/* Plan header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: isPopular ? "rgba(255,255,255,0.15)" : plan.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isPopular ? "#fff" : plan.color,
                      fontWeight: 800,
                      fontSize: 16,
                    }}
                  >
                    {plan.letter}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: isPopular ? "#fff" : "#0F172A" }}>
                      {plan.name}
                    </div>
                    <div style={{ fontSize: 12, color: isPopular ? "rgba(255,255,255,0.65)" : "#94A3B8" }}>
                      {plan.subtitle}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 28 }}>
                  <span
                    style={{
                      fontSize: 42,
                      fontWeight: 800,
                      color: isPopular ? "#fff" : "#0F172A",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "-1px",
                    }}
                  >
                    Rs{plan.price.toLocaleString("en-IN")}
                  </span>
                  <span style={{ fontSize: 14, color: isPopular ? "rgba(255,255,255,0.65)" : "#94A3B8", marginLeft: 4 }}>
                    / month
                  </span>
                </div>

                {/* CTA */}
                <Link
                  href={`/checkout?plan=${plan.key}`}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "13px 0",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    textDecoration: "none",
                    marginBottom: 28,
                    background: isPopular ? "#fff" : "#4F46E5",
                    color: isPopular ? "#4F46E5" : "#fff",
                    boxShadow: isPopular ? "0 4px 16px rgba(255,255,255,0.25)" : "none",
                  }}
                >
                  Continue to Payment
                </Link>

                {/* Divider */}
                <div style={{ borderTop: `1px solid ${isPopular ? "rgba(255,255,255,0.15)" : "#E2E8F0"}`, marginBottom: 20 }} />

                {/* Features */}
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        fontSize: 13,
                        color: isPopular ? "rgba(255,255,255,0.85)" : "#475569",
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16, color: isPopular ? "#A5F3FC" : "#10B981", flexShrink: 0, marginTop: 1 }}
                      >
                        check_circle
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: "center", marginTop: 40, fontSize: 13, color: "#94A3B8" }}>
          All plans include 14-day free trial · SOC 2 Type II · GDPR compliant · 99.97% uptime SLA
        </p>
      </div>
    </div>
  );
}
