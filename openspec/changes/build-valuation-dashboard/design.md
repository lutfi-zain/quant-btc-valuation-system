## Context

The BTC Cycle Valuation System currently has a single component (AVIV Ratio) with a basic frontend chart. The existing architecture already establishes the foundational patterns:
- **Database**: SQLite with `timeseries_metrics` (multi-metric by design via `metric_name` key), `btc_ohlc`, and `metric_config` tables
- **Backend**: Hono on Bun with hardcoded `/api/metrics/aviv_ratio` endpoint and config CRUD
- **Frontend**: Vite + React with a single chart component
- **Python**: `quant/` module with AVIV ratio fetcher using bitview.space API

This change scales the system from 1 component to 17, adds a composite oscillator, and builds the full dashboard.

### Data Source Analysis

| # | Indicator | Category | Data Source | Computation |
|---|-----------|----------|-------------|-------------|
| 1 | AVIV Ratio-Z | Fundamental | bitview.space: `cointime_price` + `price` | Price / TMM → Z-score |
| 2 | AVIV NUPL | Fundamental | bitview.space: `cointime_active_cap`, `cointime_investor_cap` | (Active Cap - Investor Cap) / Active Cap |
| 3 | CVDD Ratio | Fundamental | bitview.space: `cointime_price` or `coindays_destroyed`, `price` | Σ(CDD × Price) / 6M, then ratio to price |
| 4 | MVRV-Z | Fundamental | bitview.space: `market_cap`, `realized_cap`, `mvrv_z_score` (if available) | (Market Cap - Realized Cap) / StdDev(Market Cap) |
| 5 | LTH/STH SOPR Ratio | Fundamental | bitview.space: `sopr_more_than_155_days` / `sopr_less_than_155_days` (or compute from `sth_sopr`, `lth_sopr`) | LTH SOPR / STH SOPR |
| 6 | Terminal Price Ratio | Fundamental | bitview.space: `transferred_price` or `terminal_price`, `price` | Terminal Price / Price |
| 7 | Unrealized Sell-Side Risk | Fundamental | bitview.space: `unrealized_profit`, `unrealized_loss`, `realized_cap` | (Unrealized Profit + Unrealized Loss) / Realized Cap |
| 8 | Rolling 52W Sharpe | Technical | bitview.space: `price` (compute locally) | (Mean(LogReturn 365d) / StdDev(LogReturn 365d)) × √365 |
| 9 | Pi Cycle Top | Technical | bitview.space: `price` (compute locally) | SMA(111) / (SMA(350) × 2) |
| 10 | VPLI | Technical | bitview.space: `price` (compute locally) | Power Law residual / Annual Volatility → scaled 0-100 |
| 11 | Risk Metrics | Technical | bitview.space: `price` (compute locally) | Log deviation from SMA(374) × time_scaling → normalize 0-1 |
| 12 | DVRSI | Technical | bitview.space: `price` + `volume` (weekly, compute locally) | Volume-weighted RSI(14) with noise reducer |
| 13 | Williams %R | Technical | bitview.space: `price` (weekly, compute locally) | (Highest High - Close) / (Highest High - Lowest Low) × -100, lookback 71W |
| 14 | 2 Year MA | Technical | bitview.space: `price` (compute locally) | Price / SMA(730) |
| 15 | Ahr999 Index | Technical | bitview.space: `price` (compute locally) | Geometric mean of (Price/DCA200, Price/GrowthValuation) |
| 16 | OG Fear & Greed | Sentiment | alternative.me API (free, no auth) | Direct index value 0-100 |
| 17 | CMC Fear & Greed | Sentiment | CoinMarketCap charts page (scrape or proxy) | Direct index value 0-100 |

**Fallback strategy**: If any bitview.space on-chain series is unavailable, search for equivalent series using the bitview.space search API (`/api/series/search?q=<term>`). The platform has 49,000+ series covering virtually all on-chain metrics.

## Goals / Non-Goals

**Goals:**
- Build complete data pipeline for all 17 components with fetch/normalize/store capabilities
- Each Python component script is self-contained and runnable as a standalone "playground"
- Expose all metrics and composite oscillator through Hono API endpoints
- Build an interactive React dashboard showing all component charts + composite oscillator
- Composite oscillator aggregates all normalized scores into a single -2 to +2 value subplot against BTC price
- All normalization uses the exact threshold values documented in `docs/components.md`

**Non-Goals:**
- Machine learning or dynamic weight optimization (future work)
- Real-time streaming / WebSocket data updates (batch daily is sufficient)
- User authentication or multi-user support
- Backtesting engine or portfolio management
- Mobile-responsive design (desktop-first for research use)
- Custom indicator creation UI

## Decisions

### D1: Normalization Strategy — Linear Interpolation Between SD Bands

**Decision**: Use piecewise linear interpolation between the threshold values defined in `docs/components.md` to map raw indicator values to the -2 to +2 scale.

**Rationale**: Each indicator in `docs/components.md` defines specific raw value thresholds for -2SD, -1SD, +1SD, and +2SD. Rather than computing Z-scores from the data distribution (which requires assumptions about normality), we directly map using these expert-defined thresholds:
- Raw ≤ threshold_+2SD → normalized = +2 (High Value / Bottom)
- Raw between +2SD and +1SD → linear interpolation between +2 and +1
- Raw between +1SD and -1SD → linear interpolation between +1 and -1
- Raw between -1SD and -2SD → linear interpolation between -1 and -2
- Raw ≥ threshold_-2SD → normalized = -2 (Low Value / Top)

**Note**: Some indicators are "inverted" — higher raw values = lower valuation (e.g., MVRV-Z high = overvalued = -2). The normalization function handles direction per indicator based on whether the +2SD threshold is less than or greater than the -2SD threshold.

**Alternative considered**: Z-score normalization from data distribution. Rejected because the user has already defined empirical thresholds based on cycle research, and Z-scores assume normal distribution which BTC metrics rarely follow.

### D2: Python Component Architecture — Base Class + Registry Pattern

**Decision**: Create a `BaseComponent` abstract class in `quant/components/base.py` with standard interface: `fetch_data()`, `normalize()`, `store()`, `run_pipeline()`. Each of the 17 indicators extends this class.

A `ComponentRegistry` at `quant/components/registry.py` provides a `run_all()` function to execute all pipelines and a `get_composite()` function.

**Rationale**: Enforces the "One Component = One Script" rule while ensuring consistent interfaces. The base class handles common logic (DB connection, date handling, normalization math) while each component only implements its data-fetching and formula logic.

**Alternative considered**: Pure functions without class hierarchy. Rejected because the shared fetch/normalize/store pattern has enough boilerplate that a base class reduces duplication significantly.

### D3: Composite Oscillator — Equal-Weight Average

**Decision**: The composite oscillator is the simple arithmetic mean of all 17 normalized component values for each date. Future versions can introduce weighted averaging.

**Rationale**: Starting simple avoids premature optimization. Equal weighting is the most transparent and defensible starting point. The infrastructure supports per-component weights stored in `metric_config` for future tuning.

**Alternative considered**: Category-weighted (e.g., 50% Fundamental, 30% Technical, 20% Sentiment). Deferred to future work since weight optimization requires backtesting validation.

### D4: Frontend Charting — Recharts

**Decision**: Use Recharts for all chart rendering in the React frontend.

**Rationale**: Recharts is React-native (composable components), well-documented, and supports the required chart types (LineChart, ComposedChart with dual Y-axes for BTC price + oscillator). It's significantly simpler than D3 for this use case and supports responsive containers.

**Alternative considered**: Chart.js via react-chartjs-2. Rejected because Recharts integrates more naturally with React's component model and is easier to compose custom chart layouts.

### D5: API Design — Generic Metric Endpoint

**Decision**: Replace the hardcoded `/api/metrics/aviv_ratio` with a generic `/api/metrics/:metric_name` endpoint pattern. Add `/api/metrics` (list all), `/api/composite` (composite oscillator), and `/api/metrics/config` endpoints.

**Rationale**: The existing `timeseries_metrics` table already supports multi-metric via the `metric_name` column. A generic endpoint eliminates N×hardcoded routes and makes adding new metrics zero-cost on the backend.

### D6: Data Fetch Scheduling — Manual CLI Trigger

**Decision**: Data fetching is triggered manually via `python -m quant.run_all` or per-component `python -m quant.components.<name>`. No cron or scheduler built-in.

**Rationale**: This is a research tool, not a production service. The user fetches data when needed. Adding a scheduler adds complexity without clear value for the current use case.

## Architecture

### System Data Flow

```
bitview.space API ─┐
alternative.me API ─┤──→ Python Components ──→ SQLite DB ──→ Hono API ──→ React Dashboard
Price data (local) ─┘     (17 scripts)          (timeseries_metrics)
                          ↓
                    Normalization (-2 to +2)
                          ↓
                    Composite Oscillator
```

### Python Component Structure

```
quant/
├── components/
│   ├── __init__.py
│   ├── base.py                    # BaseComponent ABC
│   ├── registry.py                # Component registry + run_all()
│   ├── normalization.py           # Shared normalization utilities
│   ├── bitview_client.py          # bitview.space API client wrapper
│   ├── aviv_ratio.py              # AVIV Ratio-Z
│   ├── aviv_nupl.py               # AVIV NUPL
│   ├── cvdd_ratio.py              # CVDD Ratio
│   ├── mvrv_z.py                  # MVRV Z-Score
│   ├── lth_sth_sopr_ratio.py      # LTH/STH SOPR Ratio
│   ├── terminal_price_ratio.py    # Terminal Price Ratio
│   ├── unrealized_sell_risk.py    # Unrealized Sell-Side Risk Ratio
│   ├── sharpe_ratio_52w.py        # Rolling 52 Week Sharpe Ratio
│   ├── pi_cycle_top.py            # Pi Cycle Top
│   ├── vpli.py                    # VPLI
│   ├── risk_metrics.py            # Risk Metrics
│   ├── dvrsi.py                   # DVRSI
│   ├── williams_r.py              # Williams %R
│   ├── two_year_ma.py             # 2 Year MA
│   ├── ahr999.py                  # Bitcoin Ahr999 Index
│   ├── fear_greed_og.py           # OG Fear and Greed
│   └── fear_greed_cmc.py          # Fear and Greed CMC
├── run_all.py                      # CLI entry: python -m quant.run_all
└── tests/
    ├── test_normalization.py
    ├── test_base_component.py
    └── test_components.py
```

### Backend API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/metrics` | List all available metrics with latest values |
| GET | `/api/metrics/:metric_name` | Get timeseries data for a specific metric |
| GET | `/api/metrics/config/:metric_name` | Get normalization thresholds |
| POST | `/api/metrics/config` | Save normalization thresholds |
| GET | `/api/composite` | Get composite oscillator timeseries |
| GET | `/api/health` | Health check (existing) |

### Frontend Component Tree

```
App
├── DashboardLayout
│   ├── Sidebar (Category Navigation)
│   │   ├── Fundamental Indicators
│   │   ├── Technical Indicators
│   │   └── Sentiment Indicators
│   ├── MainContent
│   │   ├── CompositeOscillatorChart (BTC price + composite -2/+2 subplot)
│   │   ├── CategorySection (repeats per category)
│   │   │   └── MetricCard (repeats per metric)
│   │   │       ├── MetricChart (raw value line + BTC price)
│   │   │       └── NormalizedOverlay (-2 to +2 band visualization)
│   │   └── MetricDetailView (expanded single-metric view)
│   └── StatusBar (data freshness, fetch status)
```

### Database Schema (No Changes Required)

The existing schema supports multi-metric out of the box:

```sql
-- Already exists, supports all 17 metrics
CREATE TABLE timeseries_metrics (
    date TEXT,
    metric_name TEXT,
    raw_value REAL,
    normalized_value REAL,
    btc_price REAL,
    PRIMARY KEY (metric_name, date)
);

-- Already exists, stores per-metric thresholds
CREATE TABLE metric_config (
    metric_name TEXT PRIMARY KEY,
    t_minus_2 REAL,  -- -2SD threshold (Low Value)
    t_minus_1 REAL,  -- -1SD threshold
    t_zero REAL,     -- neutral
    t_plus_1 REAL,   -- +1SD threshold
    t_plus_2 REAL    -- +2SD threshold (High Value)
);

-- Already exists
CREATE TABLE btc_ohlc (
    date TEXT PRIMARY KEY,
    open REAL, high REAL, low REAL, close REAL
);
```

## Risks / Trade-offs

**[R1: External API availability]** → Mitigation: bitview.space is primary source (free, no rate limits). Each component has a `FALLBACK_SERIES` config. For series not on bitview, alternative sources (alternative.me, CoinGlass) are used with graceful error handling.

**[R2: Normalization threshold accuracy]** → Mitigation: Thresholds from `docs/components.md` are expert-defined and stored in `metric_config` table, allowing runtime adjustment without code changes.

**[R3: Composite oscillator equal-weight naivety]** → Mitigation: Starting simple is intentional. The weight infrastructure exists in `metric_config` for future optimization. Equal weight is the most transparent baseline.

**[R4: Some indicators have one-sided valuation]** → Mitigation: Indicators like CVDD (bottom-only), Williams %R (bottom-focused), and Unrealized Sell-Side Risk (top-only) only define thresholds for one direction. For the missing direction, they contribute a neutral score (0) to the composite, avoiding false signals.

**[R5: bitview.space series name changes]** → Mitigation: All series names are centralized in each component's `SERIES_NAME` constant. A search fallback via `/api/series/search?q=<term>` can be used to discover renamed series.
