"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AccountConnections = {
  googleConnected: boolean;
  metaConnected: boolean;
  loading: boolean;
};

/** Which ad platforms the current user has connected — drives feature gating (e.g. Keyword Analytics is Google-only). */
export function useAccountConnections(): AccountConnections {
  const [state, setState] = useState<AccountConnections>({ googleConnected: false, metaConnected: false, loading: true });
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setState({ googleConnected: false, metaConnected: false, loading: false });
          return;
        }
        const res = await fetch(`${apiUrl}/api/accounts/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const account = res.ok ? await res.json() : null;
        setState({
          googleConnected: Boolean(account?.google_ads?.connected),
          metaConnected: Boolean(account?.meta_ads?.connected),
          loading: false,
        });
      } catch {
        setState({ googleConnected: false, metaConnected: false, loading: false });
      }
    })();
  }, [apiUrl]);

  return state;
}
