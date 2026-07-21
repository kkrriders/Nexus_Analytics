select
    account_id,
    id          as campaign_id,
    name        as campaign_name,
    platform,
    status,
    budget,
    start_date,
    audience
from {{ ref('campaigns') }}
