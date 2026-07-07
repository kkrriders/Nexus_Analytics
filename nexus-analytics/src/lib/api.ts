const ENGINE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function fetchJSON(path: string) {
  const res = await fetch(`${ENGINE_URL}${path}`, { cache: 'no-store' });
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
