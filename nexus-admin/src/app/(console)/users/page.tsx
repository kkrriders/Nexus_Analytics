"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { createClient } from "@/lib/supabase/client";
import { fetchAdminUsers } from "@/lib/api";
import { timeAgo } from "@/lib/format";

type ApiUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "member";
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string | null;
};

type RoleFilter = "all" | "admin" | "member";

function initialsOf(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email[0]?.toUpperCase() ?? "?";
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersPageInner />
    </Suspense>
  );
}

function AdminUsersPageInner() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const load = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    setCurrentUserId(sessionData.session?.user.id ?? null);

    try {
      setUsers(await fetchAdminUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRole = async (user: ApiUser) => {
    const nextRole = user.role === "admin" ? "member" : "admin";
    setUpdatingId(user.id);
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) throw new Error((await res.json()).detail ?? "Update failed");
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q);
    });
  }, [users, roleFilter, search]);

  const kpis = [
    { label: "Total Users", value: String(users.length), change: "—", direction: "flat" as const, icon: "group", accent: "indigo" as const },
    { label: "Active", value: String(users.filter((u) => u.is_active).length), change: "—", direction: "flat" as const, icon: "how_to_reg", accent: "emerald" as const },
    { label: "Admins", value: String(users.filter((u) => u.role === "admin").length), change: "—", direction: "flat" as const, icon: "shield", accent: "amber" as const },
  ];

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Manage platform users and admin access across your organization."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 text-body-sm">
          <Icon name="error" className="text-[18px] mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Card className="flex flex-col overflow-hidden p-0 mb-margin-desktop">
        <div className="p-4 border-b border-outline-variant/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-bright">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-64"
              placeholder="Search users by name or email…"
            />
          </div>
          <div className="flex items-center bg-surface-container-low rounded-md p-1 border border-outline-variant">
            {(["all", "admin", "member"] as RoleFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setRoleFilter(f)}
                className={clsx(
                  "px-3 py-1 rounded text-label-md capitalize transition-colors",
                  roleFilter === f ? "bg-surface-container-lowest shadow-sm text-on-surface" : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant/40">
                {["User", "Role", "Status", "Last Active"].map((h) => (
                  <th key={h} className="px-4 py-3 text-label-caps text-on-surface-variant tracking-wider">{h}</th>
                ))}
                <th className="px-4 py-3 text-label-caps text-on-surface-variant tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {loading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">Loading users…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">No users found.</td></tr>
              )}
              {!loading && filtered.map((u) => (
                <tr key={u.id} className="hover:bg-surface-bright/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-label-md bg-primary-container/20 text-primary">
                        {initialsOf(u.full_name, u.email)}
                      </div>
                      <div>
                        <div className="text-body-sm font-medium text-on-surface">{u.full_name || "—"}</div>
                        <div className="text-label-md text-on-surface-variant">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === "admin" ? "primary" : "neutral"} icon={u.role === "admin" ? "shield" : "person"}>
                      {u.role === "admin" ? "Admin" : "Member"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("inline-flex items-center gap-1 text-label-md", u.is_active ? "text-tertiary" : "text-on-surface-variant")}>
                      <span className={clsx("w-1.5 h-1.5 rounded-full", u.is_active ? "bg-tertiary" : "bg-outline")} />
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-on-surface-variant">{timeAgo(u.last_sign_in_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleRole(u)}
                      disabled={updatingId === u.id || (u.id === currentUserId && u.role === "admin")}
                      title={u.id === currentUserId && u.role === "admin" ? "You cannot change your own admin role" : undefined}
                      className="text-label-md text-primary hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      {updatingId === u.id ? "Updating…" : u.role === "admin" ? "Make member" : "Make admin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-outline-variant/40 bg-surface-bright">
          <span className="text-label-md text-on-surface-variant">
            Showing {filtered.length} of {users.length} users
          </span>
        </div>
      </Card>
    </>
  );
}
