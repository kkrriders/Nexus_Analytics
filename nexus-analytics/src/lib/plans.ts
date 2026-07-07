export type PlanKey = "google" | "meta" | "both";

export type Plan = {
  key: PlanKey;
  name: string;
  subtitle: string;
  price: number;
  letter: string;
  color: string;
  bg: string;
  popular?: boolean;
  /** Full marketing feature list — landing page & /plans cards. */
  features: string[];
  /** Short feature list — checkout order summary. */
  summaryFeatures: string[];
};

export const PLANS: Record<PlanKey, Plan> = {
  google: {
    key: "google",
    name: "Google Ads",
    subtitle: "Built for search & display teams",
    price: 5000,
    letter: "G",
    color: "#4285F4",
    bg: "#EFF6FF",
    popular: false,
    features: [
      "Full Google Ads campaign intelligence",
      "Keyword quality score tracking",
      "Search impression share analysis",
      "Bid strategy recommendations",
      "Smart Shopping campaign insights",
      "Search term report & negatives",
      "Conversion path attribution",
      "AI budget optimizer",
      "Up to 5 workspace users",
      "Email & Slack alerts",
    ],
    summaryFeatures: [
      "Google Ads campaign intelligence",
      "Keyword quality score tracking",
      "AI budget optimizer",
      "Up to 5 users",
    ],
  },
  meta: {
    key: "meta",
    name: "Meta Ads",
    subtitle: "Built for social & paid social teams",
    price: 5000,
    letter: "M",
    color: "#0866FF",
    bg: "#EFF6FF",
    popular: false,
    features: [
      "Full Meta Ads campaign intelligence",
      "Creative fatigue detection",
      "Audience overlap & lookalike analysis",
      "Video ad performance breakdown",
      "Instagram vs Facebook placement split",
      "Frequency capping recommendations",
      "Retargeting funnel visualization",
      "AI creative swap suggestions",
      "Up to 5 workspace users",
      "Email & Slack alerts",
    ],
    summaryFeatures: [
      "Meta Ads campaign intelligence",
      "Creative fatigue detection",
      "Audience overlap analysis",
      "Up to 5 users",
    ],
  },
  both: {
    key: "both",
    name: "Google + Meta",
    subtitle: "Most popular for growth teams",
    price: 9000,
    letter: "N",
    color: "#4F46E5",
    bg: "#EEF2FF",
    popular: true,
    features: [
      "Everything in Google Ads plan",
      "Everything in Meta Ads plan",
      "Cross-platform ROAS comparison",
      "Unified audience overlap insights",
      "Cross-channel attribution modeling",
      "Priority AI command center",
      "Advanced forecasting (6-month)",
      "Custom dashboard builder",
      "Unlimited workspace users",
      "Dedicated account manager",
    ],
    summaryFeatures: [
      "Everything in Google Ads plan",
      "Everything in Meta Ads plan",
      "Cross-platform ROAS",
      "Unlimited users + Account manager",
    ],
  },
};

/** Left-to-right display order on pricing grids. */
export const PLAN_ORDER: PlanKey[] = ["google", "meta", "both"];
