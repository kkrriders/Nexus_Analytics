export type Platform = 'google_ads' | 'meta_ads' | 'linkedin_ads' | 'tiktok_ads';
export type CampaignStatus = 'active' | 'paused' | 'review' | 'draft';
export type HealthCategory = 'excellent' | 'healthy' | 'needs_attention' | 'poor' | 'critical';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type TrendDirection = 'up' | 'down' | 'flat';
export type MetricUnit = 'currency' | 'percent' | 'multiplier' | 'number';

export interface Campaign {
  id: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  budget: number;
  startDate: string;
  targetAudience: string;
}

export interface RawMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  revenue: number;
  conversions: number;
}

export interface DerivedMetrics extends RawMetrics {
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number;
  conversionRate: number;
  profit: number;
  budgetUtilization: number;
}

export interface HealthFactor {
  name: string;
  score: number;
  weight: number;
  status: 'good' | 'warning' | 'critical';
}

export interface CampaignHealth {
  score: number;
  category: HealthCategory;
  factors: HealthFactor[];
}

export interface TimeSeriesPoint {
  date: string;
  label: string;
  spend: number;
  revenue: number;
  roas: number;
  ctr: number;
  cpa: number;
  conversions: number;
  clicks: number;
  impressions: number;
}

export interface MetricForecast {
  metric: string;
  label: string;
  icon: string;
  current: number;
  forecast30d: number;
  confidence: number;
  trend: TrendDirection;
  unit: MetricUnit;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  campaignId: string;
  campaignName: string;
  message: string;
  detail: string;
  timestamp: string;
}

export interface Recommendation {
  id: string;
  campaignId: string;
  campaignName: string;
  type: 'budget' | 'bidding' | 'creative' | 'audience' | 'keywords';
  title: string;
  description: string;
  roasImpact: number;
  revenueImpact: number;
  cpaImpact: number;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

export interface ProcessedCampaign {
  campaign: Campaign;
  metrics: DerivedMetrics;
  health: CampaignHealth;
  trendDirection: TrendDirection;
  history: TimeSeriesPoint[];
  sparkline: number[];
  prevMetrics: DerivedMetrics | null;
}

export interface PlatformSummary {
  platform: Platform;
  displayName: string;
  icon: string;
  color: string;
  spend: number;
  revenue: number;
  roas: number;
  ctr: number;
  conversions: number;
  healthScore: number;
}

export interface KPISet {
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
  blendedROAS: number;
  averageCPA: number;
  averageCTR: number;
  totalProfit: number;
  aiHealthScore: number;
}

export interface KPIChanges {
  spendChange: number;
  revenueChange: number;
  roasChange: number;
  cpaChange: number;
  ctrChange: number;
  conversionsChange: number;
  profitChange: number;
  healthScoreChange: number;
}

export interface DashboardData {
  kpis: KPISet;
  kpiChanges: KPIChanges;
  campaigns: ProcessedCampaign[];
  platforms: PlatformSummary[];
  alerts: Alert[];
  recommendations: Recommendation[];
  forecasts: MetricForecast[];
  trendHistory: TimeSeriesPoint[];
  lastUpdated: string;
  nextUpdateInSeconds: number;
  windowSeed: number;
}
