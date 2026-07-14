"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AccountConnections = {
  googleConnected: boolean;
  metaConnected: boolean;
  loading: boolean;
};

type ConnectionResult = Omit<AccountConnections, "loading">;

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ~10 dashboard components each mount this hook independently; without a
// shared cache every one of them re-fetches the same /accounts/me data on
// its own mount. Cached for the life of the page — connection status rarely
// changes mid-session, and Settings already triggers its own refresh flow.
let cached: ConnectionResult | null = null;
let inFlight: Promise<ConnectionResult> | null = null;

async function fetchConnections(): Promise<ConnectionResult> {
  try {
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { googleConnected: false, metaConnected: false };

    const res = await fetch(`${apiUrl}/api/accounts/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const account = res.ok ? await res.json() : null;
    return {
      googleConnected: Boolean(account?.google_ads?.connected),
      metaConnected: Boolean(account?.meta_ads?.connected),
    };
  } catch {
    return { googleConnected: false, metaConnected: false };
  }
}

/** Which ad platforms the current user has connected — drives feature gating (e.g. Keyword Analytics is Google-only). */
export function useAccountConnections(): AccountConnections {
  const [state, setState] = useState<AccountConnections>(() =>
    cached ? { ...cached, loading: false } : { googleConnected: false, metaConnected: false, loading: true }
  );

  useEffect(() => {
    if (cached) return;
    if (!inFlight) inFlight = fetchConnections().finally(() => { inFlight = null; });
    inFlight.then((result) => {
      cached = result;
      setState({ ...result, loading: false });
    });
  }, []);

  return state;
}
