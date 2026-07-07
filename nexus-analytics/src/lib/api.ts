import { createClient } from "@/lib/supabase/client";

const ENGINE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function fetchJSON(path: string) {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Please sign in again.');

  const res = await fetch(`${ENGINE_URL}${path}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Analytics engine returned ${res.status}`);
  return res.json();
}

export const fetchDashboard       = () => fetchJSON('/api/dashboard');
export const fetchCampaigns       = () => fetchJSON('/api/campaigns');
export const fetchRecommendations = () => fetchJSON('/api/recommendations');
export const fetchForecasts       = () => fetchJSON('/api/forecasts');
export const fetchAudience        = () => fetchJSON('/api/audience');
export const fetchKeywords        = () => fetchJSON('/api/keywords');
export const fetchCreatives       = () => fetchJSON('/api/creatives');
