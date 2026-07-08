import Link from "next/link";

export const metadata = { title: "Privacy Policy" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: "#334155" }}>{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "#F8FAFC", minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 96px" }}>
        <Link href="/" style={{ fontSize: 13, color: "#4F46E5", textDecoration: "none" }}>← Back to Nexus Analytics</Link>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", margin: "16px 0 8px" }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 40 }}>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <Section title="What we collect">
          <p>
            Nexus Analytics collects the information you give us directly — your name, email, and password (handled
            by Supabase Auth) — and, if you connect an ad account, the OAuth access tokens and ad-account identifiers
            needed to fetch your campaign data from Google Ads or Meta Ads on your behalf.
          </p>
        </Section>

        <Section title="Campaign data">
          <p>
            Once you connect an ad account, we fetch campaign performance metrics (impressions, clicks, spend,
            conversions, revenue) from your ad platform and store them in our analytics database, scoped to your
            account only. This data is used exclusively to power your dashboard, reports, and AI recommendations —
            it is never shared with or sold to third parties.
          </p>
        </Section>

        <Section title="How we use your data">
          <p>
            Your data is used to render your dashboard, generate AI-driven recommendations, and — if you use the
            in-app assistant — to answer questions about your own campaigns. We do not use your advertising data to
            train shared or third-party models.
          </p>
        </Section>

        <Section title="Data retention & deletion">
          <p>
            You can disconnect an ad account at any time from Settings, which stops further data collection. To
            request full deletion of your account and associated data, contact us using the details on the{" "}
            <Link href="/security" style={{ color: "#4F46E5" }}>Security</Link> page.
          </p>
        </Section>

        <Section title="Third-party services">
          <p>
            We rely on Supabase (authentication and account storage), a ClickHouse database (analytics storage), and
            the Google Ads / Meta Ads APIs (to fetch your campaign data with your authorization). Each of these
            providers processes data under their own privacy terms.
          </p>
        </Section>
      </div>
    </div>
  );
}
