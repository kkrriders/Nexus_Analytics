"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";

const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: "10px",
  fontSize: "12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  padding: "8px 12px",
};

const REVENUE_DATA = [
  { month: "Jan", revenue: 4200 },
  { month: "Feb", revenue: 5800 },
  { month: "Mar", revenue: 4900 },
  { month: "Apr", revenue: 7200 },
  { month: "May", revenue: 6100 },
  { month: "Jun", revenue: 8400 },
  { month: "Jul", revenue: 7800 },
  { month: "Aug", revenue: 9257 },
];

const SUBSCRIBER_DATA = [
  { day: "Sun", count: 1240 },
  { day: "Mon", count: 2050 },
  { day: "Tue", count: 3874 },
  { day: "Wed", count: 1620 },
  { day: "Thu", count: 2410 },
  { day: "Fri", count: 2870 },
];

const DONUT_DATA = [
  { name: "Website", value: 374.82, fill: "#4f46e5" },
  { name: "Mobile App", value: 241.60, fill: "#4edea3" },
  { name: "Other", value: 213.42, fill: "#c7c4d8" },
];

export function SalesOverviewChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#777587" }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#777587" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
          labelStyle={{ fontWeight: 600, color: "#191c1e", marginBottom: 2 }}
          itemStyle={{ color: "#4f46e5" }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#4f46e5"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={{ r: 5, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SubscriberBarChart() {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={SUBSCRIBER_DATA} margin={{ top: 4, right: 4, left: -32, bottom: 0 }} barSize={26}>
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#777587" }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [Number(value).toLocaleString(), "Subscribers"]}
          labelStyle={{ fontWeight: 600, color: "#191c1e", marginBottom: 2 }}
          cursor={{ fill: "rgba(0,0,0,0.03)", radius: 4 }}
        />
        <Bar dataKey="count" radius={[5, 5, 0, 0]}>
          {SUBSCRIBER_DATA.map((_, i) => (
            <Cell key={i} fill={i === 2 ? "#4f46e5" : "#e0e3e5"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SalesDistributionDonut() {
  return (
    <div className="flex items-center justify-center h-full">
      <PieChart width={160} height={160}>
        <Pie
          data={DONUT_DATA}
          cx={76}
          cy={76}
          innerRadius={50}
          outerRadius={72}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {DONUT_DATA.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`₹${Number(value).toFixed(2)}`, ""]}
        />
      </PieChart>
    </div>
  );
}
