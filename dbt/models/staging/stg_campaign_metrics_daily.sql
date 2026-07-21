select
    account_id,
    campaign_id,
    date,
    impressions,
    clicks,
    spend,
    revenue,
    conversions
from {{ ref('campaign_metrics_daily') }}
