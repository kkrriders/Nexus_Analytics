import { createClient } from "@/lib/supabase/client";

const ENGINE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function authToken() {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  return token;
}

async function fetchJSON(path: string) {
  const token = await authToken();
  const res = await fetch(`${ENGINE_URL}${path}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Analytics engine returned ${res.status}`);
  return res.json();
}

async function postJSON(path: string, body?: unknown) {
  const token = await authToken();
  const res = await fetch(`${ENGINE_URL}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`Analytics engine returned ${res.status}`);
  return res.json();
}

export const fetchAdminUsers = () => fetchJSON("/api/admin/users");

export const fetchAdminNotifications = () => fetchJSON("/api/admin/notifications");
export const markAdminNotificationRead = (id: string) => postJSON(`/api/admin/notifications/${id}/read`);
export const markAllAdminNotificationsRead = () => postJSON("/api/admin/notifications/read-all");

export const fetchAdminIntegrations = () => fetchJSON("/api/admin/integrations");
export const syncAllAdminIntegrations = () => postJSON("/api/admin/integrations/sync-all");
export const syncAdminIntegration = (accountId: string) => postJSON(`/api/admin/integrations/${accountId}/sync`);
export const disconnectAdminIntegration = (accountId: string, platform: "google_ads" | "meta_ads") =>
  postJSON(`/api/admin/integrations/${accountId}/disconnect/${platform}`);
