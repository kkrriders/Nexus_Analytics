"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchCreatives } from "@/lib/api";

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

  return (
    <>
      <PageHeader
        title="Creative Analytics Gallery"
        subtitle="Fatigue scoring, CTR analysis, and AI-driven recommendations across all creatives."
        actions={
          <>
            <Button icon="filter_list">Filter</Button>
            <Button variant="primary" icon="refresh" onClick={load}>Refresh</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter pb-margin-desktop">
        {creatives.map((c: any) => <CreativeCard key={c.id} creative={c} />)}
      </div>
    </>
  );
}
