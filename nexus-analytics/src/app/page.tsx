import Link from "next/link";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

/* ─── Static Data ─────────────────────────────────────── */

const stats = [
  { value: "2.4B+", label: "Ad Impressions Tracked" },
  { value: "$840M+", label: "Ad Spend Managed" },
  { value: "99.97%", label: "Platform Uptime" },
  { value: "340ms", label: "Avg. Report Load Time" },
];

const benefits = [
  {
    icon: "insights",
    color: "#4F46E5",
    bg: "#EEF2FF",
    title: "Unified Campaign Intelligence",
    desc: "Consolidate data from Google, Meta, LinkedIn and TikTok into a single pane of glass. No more tab-switching or CSV exports.",
  },
  {
    icon: "auto_awesome",
    color: "#7C3AED",
    bg: "#F5F3FF",
    title: "AI-Powered Recommendations",
    desc: "Our proprietary AI engine surfaces budget reallocation, bid adjustments, and audience expansions before you even ask.",
  },
  {
    icon: "trending_up",
    color: "#10B981",
    bg: "#ECFDF5",
    title: "Real-Time ROAS Forecasting",
    desc: "Forward-looking revenue models with 94%+ accuracy. Know where your ROAS is heading this week, not next month.",
  },
  {
    icon: "manage_accounts",
    color: "#2563EB",
    bg: "#EFF6FF",
    title: "Audience & Keyword Depth",
    desc: "Age, device, gender, and geo segmentation alongside quality score tracking and negative keyword suggestions.",
  },
  {
    icon: "palette",
    color: "#F59E0B",
    bg: "#FFFBEB",
    title: "Creative Fatigue Detection",
    desc: "Track creative performance decay in real time and get automated swap recommendations before CTR drops impact budget.",
  },
  {
    icon: "notifications_active",
    color: "#EF4444",
    bg: "#FEF2F2",
    title: "Proactive Alert Center",
    desc: "Critical budget overruns, sudden CTR drops, and API sync failures surface instantly — no log-diving required.",
  },
];

const platforms = [
  { name: "Google Ads", color: "#4285F4", letter: "G" },
  { name: "Meta Ads", color: "#0866FF", letter: "M" },
  { name: "LinkedIn Ads", color: "#0A66C2", letter: "in" },
  { name: "TikTok Ads", color: "#010101", letter: "T" },
];

const testimonials = [
  {
    quote:
      "Nexus reduced our weekly reporting from 8 hours to under 20 minutes. The AI recommendations alone paid for the subscription in the first month.",
    name: "Priya Mehta",
    role: "Head of Performance Marketing",
    company: "Razorpay",
    initials: "PM",
    color: "#4F46E5",
  },
  {
    quote:
      "We manage $4M/month in ad spend across three platforms. Nexus is the first tool that actually gives us a single source of truth without data gaps.",
    name: "James Okafor",
    role: "VP Growth",
    company: "Shopify Plus",
    initials: "JO",
    color: "#10B981",
  },
  {
    quote:
      "The creative fatigue detection feature saved us from a $200k underperforming campaign. The ROI is undeniable.",
    name: "Sophie Laurent",
    role: "Digital Marketing Director",
    company: "L'Oréal Digital",
    initials: "SL",
    color: "#7C3AED",
  },
];

/* ─── Components ──────────────────────────────────────── */

function NavBar() {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(248,250,252,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid #E2E8F0",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 18,
              color: "#fff",
              fontFamily: "var(--font-sans)",
              letterSpacing: "-0.5px",
            }}
          >
            N
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "#0F172A",
                lineHeight: 1.1,
              }}
            >
              Nexus Analytics
            </div>
            <div
              style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500, letterSpacing: "0.05em" }}
            >
              ENTERPRISE EDITION
            </div>
          </div>
        </div>

        {/* Links */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 32 }}
          className="hidden-mobile"
        >
          {["Features", "Platforms", "Pricing", "Testimonials"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#475569",
                textDecoration: "none",
              }}
            >
              {l}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/dashboard"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#4F46E5",
              textDecoration: "none",
              padding: "8px 16px",
              borderRadius: 10,
              border: "1.5px solid #C7D2FE",
              background: "#EEF2FF",
            }}
          >
            View Demo
          </Link>
          <Link
            href="/dashboard"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
              padding: "8px 18px",
              borderRadius: 10,
              background: "#4F46E5",
            }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section
      style={{
        padding: "96px 24px 80px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          top: -80,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(79,70,229,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#F5F3FF",
            border: "1.5px solid #C4B5FD",
            borderRadius: 100,
            padding: "6px 16px",
            marginBottom: 28,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 14, color: "#7C3AED" }}
          >
            auto_awesome
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#7C3AED", letterSpacing: "0.04em" }}>
            AI-POWERED MARKETING INTELLIGENCE
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 60px)",
            fontWeight: 800,
            color: "#0F172A",
            lineHeight: 1.1,
            letterSpacing: "-1.5px",
            marginBottom: 24,
          }}
        >
          Every Ad Dollar.
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Every Insight.
          </span>
          <br />
          One Workspace.
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 18,
            color: "#475569",
            lineHeight: 1.7,
            marginBottom: 40,
            maxWidth: 600,
            margin: "0 auto 40px",
          }}
        >
          Nexus Analytics is the enterprise marketing intelligence platform that unifies Google
          Ads, Meta, LinkedIn, and TikTok — with AI that acts before you ask.
        </p>

        {/* CTA Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#4F46E5",
              color: "#fff",
              textDecoration: "none",
              padding: "14px 28px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 15,
              boxShadow: "0 4px 20px rgba(79,70,229,0.35)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              rocket_launch
            </span>
            Start Free Trial
          </Link>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              color: "#0F172A",
              textDecoration: "none",
              padding: "14px 28px",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              border: "1.5px solid #E2E8F0",
              boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#4F46E5" }}>
              play_circle
            </span>
            Watch Demo
          </Link>
        </div>

        {/* Trust line */}
        <p style={{ marginTop: 24, fontSize: 13, color: "#94A3B8" }}>
          No credit card required · 14-day free trial · SOC 2 Type II certified
        </p>
      </div>

      {/* Hero dashboard mockup */}
      <div
        style={{
          maxWidth: 1100,
          margin: "64px auto 0",
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid #E2E8F0",
          boxShadow:
            "0 20px 60px rgba(15,23,42,0.12), 0 4px 20px rgba(79,70,229,0.08)",
          background: "#fff",
        }}
      >
        {/* Mock browser chrome */}
        <div
          style={{
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
          <div
            style={{
              flex: 1,
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 6,
              padding: "4px 12px",
              fontSize: 12,
              color: "#94A3B8",
              margin: "0 12px",
            }}
          >
            app.nexusanalytics.ai/dashboard
          </div>
        </div>

        {/* Mock dashboard content */}
        <div style={{ background: "#F8FAFC", padding: 24 }}>
          {/* KPI row mock */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {[
              { label: "Total Revenue", value: "$2.84M", trend: "+18.2%", color: "#10B981" },
              { label: "Ad Spend", value: "$312K", trend: "+4.1%", color: "#2563EB" },
              { label: "Blended ROAS", value: "9.1×", trend: "+2.3×", color: "#4F46E5" },
              { label: "CPA", value: "$14.20", trend: "-12%", color: "#F59E0B" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "16px 20px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 6 }}>
                  {kpi.label}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#0F172A",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {kpi.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: kpi.color,
                    marginTop: 4,
                  }}
                >
                  {kpi.trend} vs last period
                </div>
              </div>
            ))}
          </div>

          {/* Chart + AI panel mock */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
            {/* Chart mock */}
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                padding: 20,
                height: 180,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                Revenue vs Spend Trend
              </div>
              <svg width="100%" height="120" viewBox="0 0 500 120">
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="spd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 100 C50 90 100 70 150 60 C200 50 250 40 300 30 C350 20 400 25 450 15 L500 10 L500 120 L0 120 Z"
                  fill="url(#rev)"
                />
                <path
                  d="M0 100 C50 90 100 70 150 60 C200 50 250 40 300 30 C350 20 400 25 450 15 L500 10"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                />
                <path
                  d="M0 110 C50 108 100 100 150 95 C200 90 250 85 300 80 C350 75 400 72 450 65 L500 60 L500 120 L0 120 Z"
                  fill="url(#spd)"
                />
                <path
                  d="M0 110 C50 108 100 100 150 95 C200 90 250 85 300 80 C350 75 400 72 450 65 L500 60"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                  strokeDasharray="none"
                />
              </svg>
            </div>

            {/* AI command mock */}
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#EF4444",
                    boxShadow: "0 0 6px rgba(239,68,68,0.6)",
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                  AI Command Center
                </span>
              </div>
              {[
                { severity: "#EF4444", msg: "Meta budget pacing +23% above goal" },
                { severity: "#F59E0B", msg: "Google brand CPC up 18% this week" },
                { severity: "#10B981", msg: "Reallocate $8K → Meta ROAS +2.1×" },
              ].map((a) => (
                <div
                  key={a.msg}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: a.severity,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: "#475569" }}>{a.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <section style={{ background: "#0F172A", padding: "48px 24px" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 32,
          textAlign: "center",
        }}
      >
        {stats.map((s) => (
          <div key={s.label}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#fff",
                fontFamily: "var(--font-mono)",
                letterSpacing: "-1px",
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4, fontWeight: 500 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section id="features" style={{ padding: "96px 24px", background: "#F8FAFC" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
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
            BUILT FOR PERFORMANCE MARKETERS
          </div>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-1px",
              marginBottom: 16,
            }}
          >
            Everything your team needs
          </h2>
          <p style={{ fontSize: 17, color: "#475569", maxWidth: 520, margin: "0 auto" }}>
            From campaign tables to AI recommendations, Nexus replaces a dozen spreadsheets and
            reporting tools in one workspace.
          </p>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}
        >
          {benefits.map((b) => (
            <div
              key={b.title}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: 28,
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: b.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 22, color: b.color }}
                >
                  {b.icon}
                </span>
              </div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#0F172A",
                  marginBottom: 8,
                }}
              >
                {b.title}
              </h3>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.65 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlatformSection() {
  return (
    <section id="platforms" style={{ padding: "80px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: "#ECFDF5",
            color: "#10B981",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            padding: "6px 14px",
            borderRadius: 100,
            marginBottom: 16,
          }}
        >
          PLATFORM INTEGRATIONS
        </div>
        <h2
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#0F172A",
            letterSpacing: "-1px",
            marginBottom: 12,
          }}
        >
          Every major ad platform. One dashboard.
        </h2>
        <p style={{ fontSize: 16, color: "#475569", marginBottom: 48 }}>
          Native API integrations with real-time sync — no connectors, no Zapier, no delays.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          {platforms.map((p) => (
            <div
              key={p.name}
              style={{
                background: "#fff",
                border: "1.5px solid #E2E8F0",
                borderRadius: 16,
                padding: "24px 36px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
                minWidth: 200,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: p.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: p.letter.length > 1 ? 13 : 18,
                }}
              >
                {p.letter}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#10B981", fontWeight: 600, marginTop: 2 }}>
                  ● Live sync
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      style={{
        padding: "96px 24px",
        background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div
            style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.08)",
              color: "#A5B4FC",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "6px 14px",
              borderRadius: 100,
              marginBottom: 16,
            }}
          >
            CUSTOMER STORIES
          </div>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-1px",
            }}
          >
            Trusted by marketing leaders
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {testimonials.map((t) => (
            <div
              key={t.name}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: 28,
              }}
            >
              <div
                style={{ fontSize: 36, color: t.color, marginBottom: 16, lineHeight: 1 }}
              >
                &ldquo;
              </div>
              <p
                style={{
                  fontSize: 15,
                  color: "#CBD5E1",
                  lineHeight: 1.7,
                  marginBottom: 24,
                  fontStyle: "italic",
                }}
              >
                {t.quote}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: t.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>
                    {t.role} · {t.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const order = PLAN_ORDER.map((k) => PLANS[k]); // Google, Meta, Both

  return (
    <section id="pricing" style={{ padding: "96px 24px", background: "#F8FAFC" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
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
          <h2
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-1px",
              marginBottom: 12,
            }}
          >
            Choose your platform
          </h2>
          <p style={{ fontSize: 17, color: "#475569", maxWidth: 480, margin: "0 auto" }}>
            Start with the platform where you spend the most. Bundle both and save $1,000/month.
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
                key={plan.name}
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
                    ★ MOST POPULAR — SAVE $1,000/MO
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
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 18,
                        color: isPopular ? "#fff" : "#0F172A",
                      }}
                    >
                      {plan.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: isPopular ? "rgba(255,255,255,0.65)" : "#94A3B8",
                      }}
                    >
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
                  <span
                    style={{
                      fontSize: 14,
                      color: isPopular ? "rgba(255,255,255,0.65)" : "#94A3B8",
                      marginLeft: 4,
                    }}
                  >
                    / month
                  </span>
                  {isPopular && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.7)",
                        textDecoration: "line-through",
                      }}
                    >
                      Was Rs 10,000/month billed separately
                    </div>
                  )}
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
                  Get Started
                </Link>

                {/* Divider */}
                <div
                  style={{
                    borderTop: `1px solid ${isPopular ? "rgba(255,255,255,0.15)" : "#E2E8F0"}`,
                    marginBottom: 20,
                  }}
                />

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
                        style={{
                          fontSize: 16,
                          color: isPopular ? "#A5F3FC" : "#10B981",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
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

        {/* Bottom note */}
        <p
          style={{
            textAlign: "center",
            marginTop: 40,
            fontSize: 13,
            color: "#94A3B8",
          }}
        >
          All plans include 14-day free trial · SOC 2 Type II · GDPR compliant · 99.97% uptime SLA
          ·{" "}
          <a href="mailto:sales@nexusanalytics.ai" style={{ color: "#4F46E5" }}>
            Contact sales
          </a>{" "}
          for custom enterprise pricing
        </p>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section
      style={{
        padding: "80px 24px",
        background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h2
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-1px",
            marginBottom: 16,
          }}
        >
          Ready to see every dollar work harder?
        </h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", marginBottom: 36 }}>
          Join performance teams managing over $840M in annual ad spend on Nexus Analytics.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            color: "#4F46E5",
            textDecoration: "none",
            padding: "14px 32px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            rocket_launch
          </span>
          Start Your Free Trial
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      style={{
        background: "#0F172A",
        padding: "48px 24px 32px",
        color: "#94A3B8",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 32,
          paddingBottom: 32,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          marginBottom: 24,
        }}
      >
        {/* Brand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
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
            <span style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>Nexus Analytics</span>
          </div>
          <p style={{ fontSize: 13, maxWidth: 240, lineHeight: 1.6 }}>
            Enterprise AI marketing intelligence for high-performance teams.
          </p>
        </div>

        {/* Links */}
        {[
          {
            heading: "Product",
            links: [
              { label: "Dashboard", href: "/dashboard" },
              { label: "Campaign Analytics", href: "/campaign-analytics" },
              { label: "AI Recommendations", href: "/ai-recommendations" },
              { label: "Forecasting", href: "/trend-forecasting" },
            ],
          },
          {
            heading: "Platforms",
            links: [
              { label: "Google Ads", href: "/#platforms" },
              { label: "Meta Ads", href: "/#platforms" },
              { label: "LinkedIn Ads", href: "/#platforms" },
              { label: "TikTok Ads", href: "/#platforms" },
            ],
          },
        ].map((col) => (
          <div key={col.heading}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#fff",
                marginBottom: 14,
              }}
            >
              {col.heading.toUpperCase()}
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    style={{ fontSize: 13, color: "#94A3B8", textDecoration: "none" }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 12 }}>
          © 2026 Nexus Analytics. All rights reserved.
        </span>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "Security", href: "/security" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              style={{ fontSize: 12, color: "#94A3B8", textDecoration: "none" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "#F8FAFC" }}>
      <NavBar />
      <HeroSection />
      <StatsBar />
      <BenefitsSection />
      <PlatformSection />
      <TestimonialsSection />
      <PricingSection />
      <CtaBanner />
      <Footer />
    </div>
  );
}
