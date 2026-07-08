"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchCreatives } from "@/lib/api";

const TYPE_OPTIONS = ["image", "video", "carousel"];

function FilterPopover({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button icon="filter_list" onClick={() => setOpen((o) => !o)}>
        {label}{count > 0 ? ` (${count})` : ""}
      </Button>
      {open && (
        <div className="absolute right-0 top-11 w-56 bg-surface-bright border border-outline-variant rounded-[10px] shadow-lg py-1.5 z-50 max-h-72 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      )}
    </div>
  );
}

type MetricDir = "up" | "down" | "flat";

const DIR_META: Record<MetricDir, { icon: string; tone: string }> = {
  up:   { icon: "trending_up",     tone: "text-tertiary" },
  down: { icon: "trending_down",   tone: "text-error" },
  flat: { icon: "horizontal_rule", tone: "text-outline" },
};

function CreativeCard({ creative }: { creative: any }) {
  const isVideo = creative.type === "video";
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="relative h-48 w-full bg-surface-container flex items-center justify-center shrink-0">
        <Icon name={creative.thumb_icon ?? "image"} className="text-[64px] text-on-surface/15" />
        <div className={clsx("absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-label-caps shadow-sm", creative.badge_tone)}>
          <span>{creative.badge_label}</span>
        </div>
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Icon name="play_arrow" className="text-white text-[24px]" />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-card-padding flex flex-col flex-1">
        <div className="mb-stack-md">
          <h3 className="text-headline-md text-on-surface line-clamp-1">{creative.title}</h3>
          <p className="text-body-sm text-on-surface-variant mt-1">Campaign: {creative.campaign}</p>
        </div>

        {/* Fatigue bar */}
        <div className="mb-stack-md">
          <div className="flex justify-between text-[12px] mb-1">
            <span className="text-on-surface-variant">Fatigue Score</span>
            <span className={clsx("font-bold", creative.fatigue_score >= 70 ? "text-error" : creative.fatigue_score >= 40 ? "text-warning" : "text-tertiary")}>
              {(creative.fatigue_score ?? 0).toFixed(1)}/100
            </span>
          </div>
          <div className="h-1.5 bg-surface-variant rounded-full overflow-hidden">
            <div className={clsx("h-full rounded-full",
              creative.fatigue_score >= 70 ? "bg-error" : creative.fatigue_score >= 40 ? "bg-warning" : "bg-tertiary"
            )} style={{ width: `${Math.min(100, creative.fatigue_score ?? 0)}%` }} />
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-stack-sm mb-stack-md">
          {(creative.metrics ?? []).map((metric: any) => {
            const dir = DIR_META[(metric.dir ?? "flat") as MetricDir];
            return (
              <div key={metric.label} className="bg-surface rounded-lg border border-outline-variant/50 p-2">
                <span className="text-label-caps text-on-surface-variant uppercase block mb-1">{metric.label}</span>
                <div className="flex items-end gap-1">
                  <span className="text-headline-md text-on-surface">{metric.value}</span>
                  <Icon name={dir.icon} className={clsx("text-[16px] mb-1", dir.tone)} />
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Recommendation */}
        <div className="mt-auto">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="psychology" className="text-primary text-[18px]" />
            <span className="text-label-md font-semibold text-primary">AI Recommendation</span>
          </div>
          <div className={clsx("p-3 rounded-lg", creative.rec_box_class ?? "bg-surface-container-low border border-outline-variant/50")}>
            <p className="text-body-sm text-on-surface">
              Fatigue Score: <strong className={creative.rec_score_tone ?? "text-on-surface"}>{creative.rec_score}</strong>. {creative.ai_recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveCreatives() {
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [campaignFilter, setCampaignFilter] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await fetchCreatives();
      setCreatives(data?.creatives ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-on-surface-variant text-[14px]">Loading creative analytics…</span>
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Icon name="error_outline" className="text-[40px] text-error" />
      <p className="text-on-surface font-semibold">Analytics engine not reachable</p>
      <p className="text-on-surface-variant text-[13px]">{error}</p>
      <Button variant="primary" icon="refresh" onClick={load}>Retry</Button>
    </div>
  );

  const campaignOptions = Array.from(new Set(creatives.map((c) => c.campaign).filter(Boolean)));

  const toggle = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  };

  const filtered = creatives.filter((c: any) => {
    if (typeFilter.size > 0 && !typeFilter.has(c.type)) return false;
    if (campaignFilter.size > 0 && !campaignFilter.has(c.campaign)) return false;
    return true;
  });

  const filterCount = typeFilter.size + campaignFilter.size;

  return (
    <>
      <PageHeader
        title="Creative Analytics Gallery"
        subtitle="Fatigue scoring, CTR analysis, and AI-driven recommendations across all creatives."
        actions={
          <>
            <FilterPopover label="Filter" count={filterCount}>
              <p className="px-3 py-1.5 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Type</p>
              {TYPE_OPTIONS.map((t) => (
                <label key={t} className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-on-surface hover:bg-surface-container-low cursor-pointer capitalize">
                  <input type="checkbox" checked={typeFilter.has(t)} onChange={() => toggle(typeFilter, t, setTypeFilter)} className="accent-primary" />
                  {t}
                </label>
              ))}
              <p className="px-3 py-1.5 mt-1 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide border-t border-outline-variant">Campaign</p>
              {campaignOptions.map((c) => (
                <label key={c} className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-on-surface hover:bg-surface-container-low cursor-pointer">
                  <input type="checkbox" checked={campaignFilter.has(c)} onChange={() => toggle(campaignFilter, c, setCampaignFilter)} className="accent-primary" />
                  <span className="truncate">{c}</span>
                </label>
              ))}
              {filterCount > 0 && (
                <button onClick={() => { setTypeFilter(new Set()); setCampaignFilter(new Set()); }} className="w-full text-left px-3 py-2 text-[12px] text-primary hover:bg-surface-container-low border-t border-outline-variant mt-1">
                  Clear all
                </button>
              )}
            </FilterPopover>
            <Button variant="primary" icon="refresh" onClick={load}>Refresh</Button>
          </>
        }
      />
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-on-surface-variant">
          <Icon name="filter_list_off" className="text-[40px] text-outline mb-3" />
          <p>No creatives match the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter pb-margin-desktop">
          {filtered.map((c: any) => <CreativeCard key={c.id} creative={c} />)}
        </div>
      )}
    </>
  );
}
