import Link from "next/link";

export const metadata = { title: "Terms of Service" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: "#334155" }}>{children}</div>
    </section>
  );
}

export default function TermsOfServicePage() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "#F8FAFC", minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 96px" }}>
        <Link href="/" style={{ fontSize: 13, color: "#4F46E5", textDecoration: "none" }}>← Back to Nexus Analytics</Link>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", margin: "16px 0 8px" }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 40 }}>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <Section title="Using Nexus Analytics">
          <p>
            By creating an account you agree to use Nexus Analytics only for lawful analysis of ad accounts you own
            or are authorized to manage. You are responsible for the accuracy of any ad-platform credentials you
            connect and for keeping your account credentials secure.
          </p>
        </Section>

        <Section title="Connected ad accounts">
          <p>
            When you connect a Google Ads or Meta Ads account, you authorize Nexus Analytics to fetch campaign
            performance data on your behalf via the official platform APIs. You may disconnect an account at any
            time from Settings.
          </p>
        </Section>

        <Section title="AI recommendations">
          <p>
            Recommendations, forecasts, and health scores shown in the dashboard are generated from your historical
            campaign data and are provided for informational purposes only. They are not guaranteed outcomes —
            decisions to change budgets, bids, or targeting remain entirely yours.
          </p>
        </Section>

        <Section title="Plans & billing">
          <p>
            Paid plans grant access to additional ad-platform integrations and features as described on the{" "}
            <Link href="/plans" style={{ color: "#4F46E5" }}>Plans</Link> page. You can cancel at any time; access
            continues until the end of the current billing period.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms as the product evolves. Continued use of Nexus Analytics after an update
            constitutes acceptance of the revised terms.
          </p>
        </Section>
      </div>
    </div>
  );
}
