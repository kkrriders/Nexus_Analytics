import { createClient } from "@/lib/supabase/client";

const ENGINE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function authToken() {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  return token;
}

async function fetchJSON(path: string) {
  const token = await authToken();
  const res = await fetch(`${ENGINE_URL}${path}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Analytics engine returned ${res.status}`);
  return res.json();
}

async function postJSON(path: string, body?: unknown) {
  const token = await authToken();
  const res = await fetch(`${ENGINE_URL}${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`Analytics engine returned ${res.status}`);
  return res.json();
}

export const fetchDashboard       = (days?: number) => fetchJSON(`/api/dashboard${days ? `?days=${days}` : ''}`);
export const fetchCampaigns       = (days?: number) => fetchJSON(`/api/campaigns${days ? `?days=${days}` : ''}`);
export const fetchRecommendations = () => fetchJSON('/api/recommendations');
export const fetchForecasts       = (days?: number) => fetchJSON(`/api/forecasts${days ? `?days=${days}` : ''}`);
export const fetchAudience        = () => fetchJSON('/api/audience');
export const fetchKeywords        = () => fetchJSON('/api/keywords');
export const fetchCreatives       = () => fetchJSON('/api/creatives');

export const fetchNotifications         = () => fetchJSON('/api/notifications');
export const markNotificationRead       = (id: string) => postJSON(`/api/notifications/${id}/read`);
export const markAllNotificationsRead   = () => postJSON('/api/notifications/read-all');

export type RecommendationActionBody = {
  campaign_id: string;
  type: string;
  title: string;
  action: 'approved' | 'rejected';
};
export const sendRecommendationAction = (body: RecommendationActionBody) =>
  postJSON('/api/recommendations/action', body);
