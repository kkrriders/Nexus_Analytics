export function fmt(value: number, unit: string): string {
  if (unit === "currency") {
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (abs >= 1_000_000) return `${sign}₹${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
    return `₹${value.toFixed(2)}`;
  }
  if (unit === "multiplier" || unit === "x") return `${value.toFixed(2)}x`;
  if (unit === "percent" || unit === "pct")  return `${value.toFixed(1)}%`;
  if (unit === "number")                     return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return String(value);
}
