# dbt (ClickHouse)

Standalone dbt-core project demonstrating the transformation layer this kind
of analytics platform needs: raw facts → tested, documented staging + mart
models. It runs against its **own** free ClickHouse Cloud trial, loaded via
`dbt seed` with a small sample dataset shaped like `analytics_engine`'s real
tables (`nexus.campaigns`, `nexus.campaign_metrics_daily`) — it never reads
from or depends on the production instance the live app uses.

```
seeds/campaigns.csv              ─┐
seeds/campaign_metrics_daily.csv ─┴─► stg_* (views) ─► fct_campaign_daily_performance (table)
```

## Setup

```bash
cd dbt
pip install -r requirements.txt
cp profiles.yml.example profiles.yml   # reads env vars, nothing to fill in by hand
export DBT_CLICKHOUSE_HOST=...         # your own free trial at clickhouse.com/cloud
export DBT_CLICKHOUSE_USER=...
export DBT_CLICKHOUSE_PASSWORD=...
dbt seed --profiles-dir .
dbt run  --profiles-dir .
dbt test --profiles-dir .
```

`dbt docs generate && dbt docs serve --profiles-dir .` renders the lineage
graph and column docs.

## Layout

- `seeds/` — small sample CSVs, shaped like the app's real ClickHouse tables.
- `models/staging/` — 1:1 views over the seeds.
- `models/marts/` — `fct_campaign_daily_performance`: daily grain, same
  derived-metric formulas as `analytics_engine/analytics/feature_engineering.py`
  (`compute_derived`), so this mirrors the live app's math.
- `tests/` — one grain-uniqueness test; column-level tests live next to each
  seed/model in `_*.yml`.

`.github/workflows/dbt-run.yml` runs `dbt seed && dbt run && dbt test`
nightly against `DBT_CLICKHOUSE_*` repo secrets (a second, separate
ClickHouse Cloud trial — not the app's).

To point this at real ingested data instead of the seeds later, swap the
`ref('campaigns')` / `ref('campaign_metrics_daily')` in `models/staging/*.sql`
for a `source()` pointing at `analytics_engine`'s `nexus` database.
