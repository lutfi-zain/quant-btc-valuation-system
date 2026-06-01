## 1. Python Foundation & Shared Utilities

- [x] 1.1 Create `quant/components/` package with `__init__.py` and restructure existing `quant/aviv_ratio.py` into the new directory structure
- [x] 1.2 Implement `quant/components/base.py` — `BaseComponent` abstract class with `fetch_data()`, `normalize()`, `store()`, `run_pipeline()`, `get_latest_date()` methods and `METRIC_NAME`, `DESCRIPTION`, `CATEGORY` class attributes
- [x] 1.3 Implement `quant/components/bitview_client.py` — bitview.space API client with `fetch_series(name, index, start_date)` and `search_series(query)`, HTTP error handling with retry/exponential backoff for 5xx, timeout=30s
- [x] 1.4 Implement `quant/components/normalization.py` — piecewise linear interpolation function mapping raw values to -2/+2 scale, handling normal/inverted/one-sided metrics, loading thresholds from `metric_config` table
- [x] 1.5 Write pytest tests for `base.py`, `bitview_client.py`, and `normalization.py` in `quant/tests/`
- [x] 1.6 Implement `quant/seed_metric_config.py` — seed all 17 metric threshold configs into `metric_config` table with exact values from `docs/components.md`
- [x] 1.7 Validate: Run `python -m pytest -xvs` to confirm all foundation tests pass

## 2. Fundamental Indicator Components (On-Chain)

- [x] 2.1 Implement `quant/components/aviv_ratio.py` — Refactor existing AVIV Ratio script to extend `BaseComponent`, fetch `cointime_price` + `price` from bitview.space, compute AVIV Ratio = Price/TMM, normalize using thresholds (-2, -1, 1, 2)
- [x] 2.2 Implement `quant/components/aviv_nupl.py` — Fetch `active_cap` + `investor_cap` from bitview.space, compute (Active Cap - Investor Cap) / Active Cap, normalize (-0.6, -0.3, 0.3, 0.5)
- [x] 2.3 Implement `quant/components/cvdd_ratio.py` — Fetch `coindays_destroyed` + `price` from bitview.space, compute CVDD = Σ(CDD×Price)/6M then ratio to price, normalize bottom-only (1.3, 1.6)
- [x] 2.4 Implement `quant/components/mvrv_z.py` — Fetch `market_cap` + `realized_cap` from bitview.space (or direct `mvrv_z_score` series), compute Z-score, normalize (0.15, 0.17, 4.6, 6.65)
- [x] 2.5 Implement `quant/components/lth_sth_sopr_ratio.py` — Fetch LTH SOPR + STH SOPR from bitview.space, compute LTH/STH ratio, normalize (0.73, 0.99, 3.2, 6.9)
- [x] 2.6 Implement `quant/components/terminal_price_ratio.py` — Fetch `transferred_price` from bitview.space, compute Terminal Price = Transferred Price × 21, ratio to Price, normalize inverted (1, 0.75, 0.25, 0.17)
- [x] 2.7 Implement `quant/components/unrealized_sell_risk.py` — Fetch unrealized profit/loss + realized cap from bitview.space, compute risk ratio, normalize top-only (1.8, 2.2)
- [x] 2.8 Write pytest tests for all 7 fundamental components (mocking bitview API responses)
- [x] 2.9 Validate: Run each component standalone (`python -m quant.components.aviv_ratio`) and verify data in SQLite

## 3. Technical Indicator Components (Price-Based)

- [x] 3.1 Implement `quant/components/sharpe_ratio_52w.py` — Compute from daily price: Rolling 365-day log returns → (Mean/StdDev)×√365, normalize (-20, -10, 42, 53)
- [x] 3.2 Implement `quant/components/pi_cycle_top.py` — Compute SMA(111) / (SMA(350) × 2) ratio from daily price, normalize (0.35, 0.45, 0.7, 0.95)
- [x] 3.3 Implement `quant/components/vpli.py` — Compute Power Law regression (log-log), residual adjusted by annual volatility, scale 0-100, normalize (45, 50, 70, 80)
- [x] 3.4 Implement `quant/components/risk_metrics.py` — Compute SMA(374), log deviation × bar_index^0.395, normalize to 0-1, then score (0.13, 0.33, 0.75, 0.85)
- [x] 3.5 Implement `quant/components/dvrsi.py` — Fetch price + volume from bitview.space, compute volume-weighted RSI(14) with noise reducer on weekly timeframe, normalize (42, 50, 65, 73)
- [x] 3.6 Implement `quant/components/williams_r.py` — Compute weekly Williams %R with 71-week lookback from price OHLC, normalize bottom-only (-80, -70)
- [x] 3.7 Implement `quant/components/two_year_ma.py` — Compute Price / SMA(730), normalize (0.7, 1, 3, 4.2)
- [x] 3.8 Implement `quant/components/ahr999.py` — Compute geometric mean of (Price/DCA200) × (Price/GrowthValuation), normalize (0.45, 0.7, 2.9, 5.47)
- [x] 3.9 Write pytest tests for all 8 technical components
- [x] 3.10 Validate: Run each component standalone and verify data in SQLite

## 4. Sentiment Indicator Components (External APIs)

- [x] 4.1 Implement `quant/components/fear_greed_og.py` — Fetch from `https://api.alternative.me/fng/?limit=0&format=json`, store daily values, normalize (30, 50, 60, 70)
- [x] 4.2 Implement `quant/components/fear_greed_cmc.py` — Fetch from CoinMarketCap Fear & Greed API/page, store daily values, normalize (20, 40, 60, 80)
- [x] 4.3 Write pytest tests for both sentiment components (mocking external APIs)
- [x] 4.4 Validate: Run each component standalone and verify data in SQLite

## 5. Pipeline Orchestrator

- [x] 5.1 Implement `quant/components/registry.py` — Component registry that auto-discovers all 17 components
- [x] 5.2 Implement `quant/run_all.py` — CLI orchestrator: sequential execution of all 17 pipelines, per-component exception isolation, summary table output, support `--rebuild` flag
- [x] 5.3 Write pytest test for `run_all.py` ensuring all components execute and failures are isolated
- [x] 5.4 Validate: Run `python -m quant.run_all` and confirm all 17 metrics are stored in `timeseries_metrics` table

## 6. Backend API Extension

- [x] 6.1 Refactor `backend/index.ts` — Replace hardcoded `/api/metrics/aviv_ratio` with generic `GET /api/metrics/:metric_name` endpoint that queries `timeseries_metrics` by any metric_name parameter
- [x] 6.2 Add `GET /api/metrics` endpoint — List all available metrics with their latest date, latest raw value, latest normalized value, and category
- [x] 6.3 Add `GET /api/composite` endpoint — Query all metrics per date, compute arithmetic mean of normalized values, return `{ date, composite_value, component_count, btc_price }[]` with optional `start`/`end` query params
- [x] 6.4 Add `GET /api/metrics/configs` endpoint — Return all metric configs at once (bulk config fetch for dashboard)
- [x] 6.5 Update database seed: call `init_db()` with metric_config seeding on server startup
- [x] 6.6 Write Bun tests for all new/modified API endpoints in `backend/index.test.ts`
- [x] 6.7 Validate: Start backend with `bun run backend/index.ts`, test with curl:
  - `curl localhost:3000/api/metrics`
  - `curl localhost:3000/api/metrics/aviv_ratio`
  - `curl localhost:3000/api/composite`
  - `curl localhost:3000/api/metrics/configs`

## 7. Frontend Dashboard — Foundation

- [x] 7.1 Install Recharts dependency: `cd frontend && bun add recharts`
- [x] 7.2 Create `frontend/src/api/client.ts` — API client functions: `fetchMetrics()`, `fetchMetricData(name)`, `fetchComposite()`, `fetchMetricConfigs()`
- [x] 7.3 Create `frontend/src/utils/colors.ts` — Color utility for normalized value gradient (green +2 → yellow 0 → red -2) using linear interpolation between HSL anchor points
- [x] 7.4 Create `frontend/src/types/metrics.ts` — TypeScript types for API responses: `MetricSummary`, `MetricDataPoint`, `CompositeDataPoint`, `MetricConfig`
- [x] 7.5 Update `frontend/src/App.tsx` — Replace existing single-chart view with new dashboard layout

## 8. Frontend Dashboard — Components

- [x] 8.1 Create `frontend/src/components/Sidebar.tsx` — Sidebar with 3 collapsible category sections (Fundamental 7, Technical 8, Sentiment 2), click-to-scroll navigation
- [x] 8.2 Create `frontend/src/components/CompositeChart.tsx` — Dual-axis Recharts ComposedChart: BTC price (left Y, log scale) + composite oscillator (right Y, -2 to +2), color bands (green/yellow/red), tooltip
- [x] 8.3 Create `frontend/src/components/MetricCard.tsx` — Card showing metric name, current raw value, normalized score badge with gradient color, 90-day sparkline mini chart
- [x] 8.4 Create `frontend/src/components/MetricGrid.tsx` — Responsive CSS grid (3/2/1 columns) displaying MetricCards grouped by category with section headers
- [x] 8.5 Create `frontend/src/components/MetricDetail.tsx` — Full-width expanded view with dual-axis chart (BTC price + raw metric value + normalized overlay), threshold stats panel
- [x] 8.6 Create `frontend/src/components/DashboardLayout.tsx` — Main layout composing Sidebar, CompositeChart, MetricGrid with loading/error states
- [x] 8.7 Style the dashboard with premium dark theme in `frontend/src/App.css` and `frontend/src/index.css`

## 9. Frontend Dashboard — Integration

- [x] 9.1 Wire up data fetching: parallel API calls on dashboard load, per-metric lazy loading on MetricCard click
- [x] 9.2 Implement loading skeletons for all chart components
- [x] 9.3 Implement error states with Retry buttons (per-section independent error handling)
- [x] 9.4 Add category click-to-scroll navigation from Sidebar to corresponding MetricGrid sections
- [x] 9.5 Test: `cd frontend && bun run dev` — verify dashboard loads with all 17 metric cards, composite chart, and category navigation
- [x] 9.6 Write Bun/Vitest tests for key frontend components (CompositeChart, MetricCard, color utility)

## 10. End-to-End Validation

- [x] 10.1 Run full data pipeline: `python -m quant.seed_metric_config && python -m quant.run_all`
- [x] 10.2 Start backend: `bun run backend/index.ts`
- [x] 10.3 Start frontend: `cd frontend && bun run dev`
- [x] 10.4 Manual validation: verify all 17 metric charts render with data, composite oscillator shows aggregated score, color coding works correctly
- [x] 10.5 Run all Python tests: `python -m pytest --cov`
- [x] 10.6 Run all backend tests: `cd backend && bun test`
- [x] 10.7 Run all frontend tests: `cd frontend && bun test`

## 11. Auto-Verification

- [x] 11.1 Read all artifacts (proposal.md, design.md, all specs, tasks.md) and verify every SHALL/MUST requirement is implemented
- [x] 11.2 Launch Hono server locally, run E2E curl verification against all API endpoints
- [x] 11.3 Spawn parallel reviewer subagents to audit: (1) code correctness vs specs, (2) test coverage, (3) coding conventions and style consistency
- [x] 11.4 Fix any gaps or issues found by reviewers
- [x] 11.5 Final confirmation: all tests pass, all endpoints respond correctly, dashboard renders all 17 components + composite oscillator

