import Link from "next/link";

export const metadata = { title: "Security" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: "#334155" }}>{children}</div>
    </section>
  );
}

export default function SecurityPage() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "#F8FAFC", minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 96px" }}>
        <Link href="/" style={{ fontSize: 13, color: "#4F46E5", textDecoration: "none" }}>← Back to Nexus Analytics</Link>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", margin: "16px 0 8px" }}>Security</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 40 }}>How Nexus Analytics protects your account and data.</p>

        <Section title="Authentication">
          <p>
            Sign-in is handled by Supabase Auth. Passwords are never stored in our own database — Supabase hashes
            and manages credentials, and sessions are issued as short-lived tokens verified on every request.
          </p>
        </Section>

        <Section title="Data isolation">
          <p>
            Every connected ad account, campaign record, and AI recommendation is scoped to the owning user's
            account id at the database level. One user's connected ad account is never visible to another user's
            request — this is enforced in the API layer on every query, not just the UI.
          </p>
        </Section>

        <Section title="Credential storage">
          <p>
            OAuth tokens for connected ad platforms are stored server-side and are only used by our backend to fetch
            your campaign data from Google Ads / Meta Ads. They are never exposed to the browser.
          </p>
        </Section>

        <Section title="Admin access">
          <p>
            Administrative actions (user role management, platform-wide integration status) are gated behind a
            separate admin console with its own authentication check on every request, independent of the main
            workspace.
          </p>
        </Section>

        <Section title="Questions or a report">
          <p>
            If you believe you&apos;ve found a security issue, or want your account and data deleted, please reach
            out to the account owner directly.
          </p>
        </Section>
      </div>
    </div>
  );
}
