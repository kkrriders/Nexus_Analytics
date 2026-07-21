-- Fails (returns rows) if the fact table's grain — (account_id, campaign_id, date) — is violated.
select account_id, campaign_id, date, count(*) as row_count
from {{ ref('fct_campaign_daily_performance') }}
group by account_id, campaign_id, date
having count(*) > 1
