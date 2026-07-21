-- Daily grain version of the derived metrics analytics_engine computes live
-- per 5-minute window (analytics/feature_engineering.py::compute_derived).
-- This is the batch/historical counterpart used for trend & BI reporting,
-- not a replacement for the live pipeline.
with metrics as (
    select * from {{ ref('stg_campaign_metrics_daily') }}
),
campaigns as (
    select * from {{ ref('stg_campaigns') }}
)

select
    m.account_id,
    m.campaign_id,
    c.campaign_name,
    c.platform,
    m.date,
    m.impressions,
    m.clicks,
    m.spend,
    m.revenue,
    m.conversions,

    round(if(m.impressions > 0, m.clicks / m.impressions * 100, 0), 2)   as ctr,
    round(if(m.clicks > 0, m.spend / m.clicks, 0), 2)                    as cpc,
    round(if(m.impressions > 0, m.spend / m.impressions * 1000, 0), 2)  as cpm,
    round(if(m.conversions > 0, m.spend / m.conversions, 0), 2)         as cpa,
    round(if(m.spend > 0, m.revenue / m.spend, 0), 2)                   as roas,
    round(if(m.clicks > 0, m.conversions / m.clicks * 100, 0), 2)       as conversion_rate,
    round(m.revenue - m.spend, 2)                                       as profit,
    round(if(c.budget > 0, m.spend / c.budget * 100, 0), 1)             as budget_utilization

from metrics m
left join campaigns c
    on m.account_id = c.account_id
    and m.campaign_id = c.campaign_id
