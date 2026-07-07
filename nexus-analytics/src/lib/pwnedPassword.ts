/**
 * Checks a password against HaveIBeenPwned's Pwned Passwords API using the
 * k-anonymity model: only the first 5 hex chars of the SHA-1 hash are sent,
 * never the password or full hash. Free, no API key required.
 * Fails open (returns false) on network/API errors so an outage never blocks signup.
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const buffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
    const hash = Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;

    const body = await res.text();
    return body.split("\n").some((line) => line.split(":")[0] === suffix);
  } catch {
    return false;
  }
}
