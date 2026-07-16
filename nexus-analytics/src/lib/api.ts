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

async function postJSON(path: string, body?: unknown, method: 'POST' | 'PUT' = 'POST') {
  const token = await authToken();
  const res = await fetch(`${ENGINE_URL}${path}`, {
    method,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`Analytics engine returned ${res.status}`);
  return res.json();
}

// Either a preset trailing window (7/30/90 days) or an explicit custom range
// picked in the TopNav date picker — both compile down to the same query string.
export type DateRangeParam = { days: number } | { start: string; end: string };

function rangeQuery(range?: DateRangeParam): string {
  if (!range) return '';
  return 'start' in range ? `?start_date=${range.start}&end_date=${range.end}` : `?days=${range.days}`;
}

export const fetchDashboard       = (range?: DateRangeParam) => fetchJSON(`/api/dashboard${rangeQuery(range)}`);
export const fetchCampaigns       = (range?: DateRangeParam) => fetchJSON(`/api/campaigns${rangeQuery(range)}`);
export const fetchCampaignDeviceBreakdown = (campaignId: string) => fetchJSON(`/api/campaigns/${encodeURIComponent(campaignId)}/device-breakdown`);
export const fetchRecommendations = () => fetchJSON('/api/recommendations');
export const fetchForecasts       = (range?: DateRangeParam) => fetchJSON(`/api/forecasts${rangeQuery(range)}`);
export const fetchAudience        = () => fetchJSON('/api/audience');
export const fetchKeywords        = () => fetchJSON('/api/keywords');
export const fetchCreatives       = () => fetchJSON('/api/creatives');
export const fetchSpendAnalytics  = () => fetchJSON('/api/spend');
export const syncAccount          = () => postJSON('/api/accounts/sync');
export const fetchBudgetOptimizer = (totalBudget?: number) =>
  fetchJSON(`/api/budget-optimizer${totalBudget ? `?total_budget=${totalBudget}` : ''}`);

export const fetchNotifications         = () => fetchJSON('/api/notifications');
export const markNotificationRead       = (id: string) => postJSON(`/api/notifications/${id}/read`);
export const markAllNotificationsRead   = () => postJSON('/api/notifications/read-all');

export type NotificationPrefs = {
  criticalAlerts: boolean;
  weeklySummary: boolean;
  aiDigest: boolean;
  productUpdates: boolean;
};
export const fetchNotificationPrefs = (): Promise<NotificationPrefs> => fetchJSON('/api/settings/notification-prefs');
export const saveNotificationPrefs  = (prefs: NotificationPrefs) => postJSON('/api/settings/notification-prefs', prefs, 'PUT');

export type RecommendationActionBody = {
  campaign_id: string;
  type: string;
  title: string;
  action: 'approved' | 'rejected';
};
export const sendRecommendationAction = (body: RecommendationActionBody) =>
  postJSON('/api/recommendations/action', body);
