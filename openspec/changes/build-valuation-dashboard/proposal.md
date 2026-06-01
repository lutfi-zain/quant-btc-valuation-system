## Why

The BTC Cycle Valuation System currently has only **one component implemented** (AVIV Ratio) with a minimal single-metric chart. The system's core purpose — producing a **composite valuation oscillator (-2 to +2)** that aggregates all 17 indicators across Fundamental, Technical, and Sentiment pillars — is entirely unbuilt. Without the full data pipeline, normalization engine, and dashboard, the system cannot fulfill its primary goal of identifying Bitcoin cycle peaks, troughs, and mid-cycle phases for long-term investment decisions.

Building the complete dashboard now establishes the end-to-end data workflow: **fetch → store → normalize → visualize → composite**, unlocking the system's actual value proposition.

## What Changes

- **17 Python component scripts** (`quant/components/<name>.py`), each fetching raw metric data from bitview.space API or external sources (alternative.me, CoinGlass, CoinAnk, etc.), storing to SQLite, and normalizing to the -2 to +2 scale using the thresholds defined in `docs/components.md`
- **New Hono API endpoints** serving every metric's timeseries data and the composite oscillator via `/api/metrics/:metric_name` (generic) and `/api/composite`
- **React dashboard frontend** with:
  - Individual interactive charts for all 17 indicators (raw value + normalized -2/+2 overlay)
  - A **composite oscillator subplot** showing BTC price with the aggregated valuation oscillator (-2 to +2) overlaid, combining all indicators
  - Category grouping (Fundamental / Technical / Sentiment tabs/sections)
- **Data source strategy**: Primary source is **bitview.space** API (free, no auth, 49K+ series). For metrics unavailable on bitview.space (Fear & Greed indices), use alternative public APIs. For TradingView-only indicators (DVRSI, Risk Metrics), compute from raw price/volume data using the documented formulas
- **Composite aggregation engine**: Equal-weight average of all normalized component scores to produce the master oscillator, with infrastructure for future weight tuning

## Capabilities

### New Capabilities
- `data-pipeline`: Python data fetching and storage pipeline for all 17 components — each component as an isolated script with fetch/normalize/store functions, using bitview.space API as primary data source
- `metric-normalization`: Normalization engine mapping raw indicator values to the -2 to +2 valuation scale using the threshold rules from `docs/components.md` (linear interpolation between SD bands)
- `composite-oscillator`: Aggregation of all normalized metrics into a single composite valuation oscillator (-2 to +2), served via API
- `valuation-dashboard`: React frontend with per-component charts (raw + normalized), category navigation, and a composite oscillator subplot against BTC price

### Modified Capabilities
- `metric-playground`: The existing single-metric playground will be superseded by the full dashboard. The generic `/api/metrics/:metric_name` endpoint pattern replaces the hardcoded `/api/metrics/aviv_ratio` endpoint
- `playground-config`: Existing metric_config table and API remain but are extended to support all 17 metrics with their threshold values

## Impact

- **Python (`/quant`)**: 17 new component scripts + shared utilities for bitview.space API client, normalization functions, and composite calculation
- **Database (`/database`)**: Schema unchanged (existing `timeseries_metrics` and `metric_config` tables support multi-metric by design), but seeded with 17 metric configs
- **Backend (`/backend`)**: New generic metric endpoint, composite endpoint, and metric listing endpoint
- **Frontend (`/frontend`)**: Major expansion — new dashboard pages, chart components (likely Recharts), category navigation, composite oscillator view
- **Dependencies**: Python `requests` (already present), React charting library (Recharts or similar)
- **External APIs**: bitview.space (no auth), alternative.me (no auth), CoinGlass/CoinAnk (may need evaluation for scraping feasibility)
