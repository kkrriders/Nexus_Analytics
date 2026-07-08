"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

type DataPoint = { label: string; [key: string]: number | string };

type TrendConfig = { key: string; color: string; data: DataPoint[] };

const STATIC_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildStaticData(): Record<string, TrendConfig> {
  return {
    Spend:       { key:"spend",       color:"#2563EB", data:STATIC_MONTHS.slice(0,8).map((m,i)=>{const b=[32,38,35,45,41,52,48,58]; return{label:m,value:b[i]*1000}}) },
    Revenue:     { key:"revenue",     color:"#10B981", data:STATIC_MONTHS.slice(0,8).map((m,i)=>{const b=[89,104,96,124,112,145,131,162]; return{label:m,value:b[i]*1000}}) },
    ROAS:        { key:"roas",        color:"#4F46E5", data:STATIC_MONTHS.slice(0,8).map((m,i)=>{const b=[2.8,2.7,2.7,2.8,2.7,2.8,2.7,2.8]; return{label:m,value:b[i]}}) },
    CPA:         { key:"cpa",         color:"#F59E0B", data:STATIC_MONTHS.slice(0,8).map((m,i)=>{const b=[28,26,27,25,26,24,25,24]; return{label:m,value:b[i]}}) },
    CTR:         { key:"ctr",         color:"#06B6D4", data:STATIC_MONTHS.slice(0,8).map((m,i)=>{const b=[3.8,4.1,3.9,4.4,4.2,4.7,4.6,4.8]; return{label:m,value:b[i]}}) },
    Conversions: { key:"conversions", color:"#8B5CF6", data:STATIC_MONTHS.slice(0,8).map((m,i)=>{const b=[1820,2104,1940,2480,2290,2870,2640,3100]; return{label:m,value:b[i]}}) },
  };
}

function buildLiveData(history: DataPoint[]): Record<string, TrendConfig> {
  return {
    Spend:       { key:"spend",       color:"#2563EB", data:history.map(p=>({label:p.label,value:p.spend})) },
    Revenue:     { key:"revenue",     color:"#10B981", data:history.map(p=>({label:p.label,value:p.revenue})) },
    ROAS:        { key:"roas",        color:"#4F46E5", data:history.map(p=>({label:p.label,value:p.roas})) },
    CPA:         { key:"cpa",         color:"#F59E0B", data:history.map(p=>({label:p.label,value:p.cpa})) },
    CTR:         { key:"ctr",         color:"#06B6D4", data:history.map(p=>({label:p.label,value:p.ctr})) },
    Conversions: { key:"conversions", color:"#8B5CF6", data:history.map(p=>({label:p.label,value:p.conversions})) },
  };
}

function fmt(key: string, v: number): string {
  if (key === "spend" || key === "revenue") return `₹${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v.toFixed(0)}`;
  if (key === "roas") return `${v.toFixed(2)}x`;
  if (key === "cpa") return `₹${v.toFixed(0)}`;
  if (key === "ctr") return `${v.toFixed(1)}%`;
  return v.toLocaleString();
}

const TIME_FILTERS = ["Daily","Weekly","Monthly","Quarterly"] as const;
const TOOLTIP_STYLE = {
  background:"#fff", border:"1px solid #E2E8F0", borderRadius:"10px",
  fontSize:"13px", boxShadow:"0 4px 16px rgba(15,23,42,0.1)", padding:"10px 14px",
};

export function TrendChart({ history }: { history?: DataPoint[] }) {
  const [activeTrend, setActiveTrend] = useState("Revenue");
  const [activeTime, setActiveTime] = useState<typeof TIME_FILTERS[number]>("Daily");

  const TREND_DATA = history && history.length > 0 ? buildLiveData(history) : buildStaticData();
  const t = TREND_DATA[activeTrend];

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {Object.keys(TREND_DATA).map(k => (
          <button
            key={k}
            onClick={() => setActiveTrend(k)}
            className={`px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all ${
              activeTrend === k
                ? "text-white shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
            style={activeTrend === k ? { backgroundColor: TREND_DATA[k].color } : undefined}
          >
            {k}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 bg-surface-container rounded-[8px] p-0.5">
          {TIME_FILTERS.map(tf => (
            <button
              key={tf}
              onClick={() => setActiveTime(tf)}
              className={`px-3 py-1 rounded-[6px] text-[12px] font-medium transition-all ${
                activeTime === tf ? "bg-surface-bright shadow-sm text-on-surface" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={t.data} margin={{ top:8, right:8, left:-8, bottom:0 }}>
          <defs>
            <linearGradient id={`grad-${t.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={t.color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize:11, fill:"#94A3B8" }} axisLine={false} tickLine={false} dy={6} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize:11, fill:"#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => fmt(t.key, Number(v))} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [fmt(t.key, Number(value)), activeTrend]}
            labelStyle={{ fontWeight:600, color:"#0F172A", marginBottom:4 }}
          />
          <Area type="monotone" dataKey="value" stroke={t.color} strokeWidth={2}
            fill={`url(#grad-${t.key})`} dot={false}
            activeDot={{ r:5, fill:t.color, strokeWidth:2, stroke:"#fff" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendDonut({ platforms }: { platforms?: { display_name: string; spend: number; color: string }[] }) {
  const data = platforms && platforms.length > 0
    ? platforms.map(p => ({ name: p.display_name, value: Math.round(p.spend), fill: p.color }))
    : [
        { name:"Google Ads",  value:45, fill:"#4F46E5" },
        { name:"Meta Ads",    value:32, fill:"#2563EB" },
        { name:"LinkedIn",    value:18, fill:"#06B6D4" },
        { name:"TikTok Ads",  value:12, fill:"#8B5CF6" },
      ];

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <PieChart width={120} height={120}>
        <Pie data={data} cx={56} cy={56} innerRadius={36} outerRadius={54}
          paddingAngle={3} dataKey="value" strokeWidth={0}>
          {data.map((e,i) => <Cell key={i} fill={e.fill} />)}
        </Pie>
      </PieChart>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2 text-[13px]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:d.fill }} />
            <span className="text-on-surface-variant">{d.name}</span>
            <span className="font-semibold text-on-surface ml-auto">
              {total > 0 ? `${Math.round(d.value / total * 100)}%` : "0%"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
