# 📝 Daily Reflection: 2026-05-30

**Session:** Chart Migration & Project Setup
**Agent:** Antigravity (Compound Pi)
**Duration/Effort:** ~3 hours (High)

## 1. What I Did
- [x] Initialized the `quant-btc-valuation-system` using the OpenSpec workflow (`setup-project`).
- [x] Implemented the Python quant backend for data ingestion (`btc_ohlc.py`, `aviv_ratio.py`).
- [x] Configured SQLite database with WAL mode to support high-concurrency between Python and Bun.
- [x] Built the Hono backend API exposing endpoints for AVIV Ratio and BTC OHLC data.
- [x] Replaced `recharts` with TradingView's `lightweight-charts` on the React frontend.
- [x] Implemented fully synced TradingView-style dual-pane charts (Price Candlesticks + AVIV Z-Score) with perfect crosshair and time-scale alignment.
- [x] Resolved component lifecycle memory leaks and strict timestamp alignment issues.

## 2. Key Findings
- **Finding 1 (Lightweight Charts v5 API):** The `lightweight-charts` library recently changed its API. Rather than specific methods like `chart.addCandlestickSeries()`, the new pattern uses `chart.addSeries(CandlestickSeries, {...})`. 
- **Finding 2 (Syncing Unaligned Data in TradingView Charts):** To synchronize `logicalRange` (scrolling/zooming) across multiple charts natively, both charts must contain the exact same time points. If one series starts later (e.g. 2016 vs 2009), the logical indices become misaligned. The solution is to collect all unique dates from all datasets and inject "Whitespace Data" (objects containing just `{ time }` with no value) for any missing dates.

## 3. Decisions Made
| Decision | Rationale | Alternatives Considered |
|---|---|---|
| **Use `lightweight-charts` over `recharts`** | The user specifically requested a "TradingView-like" chart with candlesticks, toggles, log/linear scale, and synchronized sub-panels. `recharts` is too generic and performs poorly with 5000+ data points. | Custom D3.js or sticking to `recharts` (rejected for UX reasons). |
| **Use `display: none` for panel toggles** | Unmounting the React `div` reference while keeping the lightweight chart instance alive caused strict null-reference crashes. Using CSS to hide the div preserves the DOM node for chart rendering. | Re-initializing the chart on every mount/unmount (rejected due to memory leaks and performance). |
| **Disable `eslint` for `setData`** | The `lightweight-charts` typings for `setData` heavily enforce strict structural interfaces that became incompatible when we dynamically padded missing dates. A localized disable comment solved it cleanly. | Refactoring the entire data pipeline to match the generic types (rejected as too verbose). |

## 4. Artifacts
| File | Action | Description |
|---|---|---|
| `frontend/src/components/AvivRatioChart.tsx` | Modified | Core implementation of the dual-pane synced TradingView charts. |
| `frontend/src/components/AvivRatioChart.css` | Modified | Added styles to match modern dark-mode trading setups. |
| `database/db.py` | Modified | Implemented `btc_ohlc` data storage and WAL mode. |
| `backend/index.ts` | Modified | Added data serving endpoints complying to `SerializerV2`. |
| `quant/btc_ohlc.py` | Created | Scraper/Fetcher for 5700+ days of BTC OHLC data from bitview.space. |

## 5. Session Metrics
- **Energy:** High
- **Focus:** Deep
- **Satisfaction:** High (Successfully replicated a complex financial chart UI)

## 6. Blockers & Challenges
- Encountered a major API deprecation trap where `chart.addCandlestickSeries` threw a runtime exception that blocked frontend rendering.
- `lightweight-charts` crosshairs initially failed to sync because React's `useEffect` trapped old data arrays in a stale closure. Solved it by binding fresh data via `useRef`.
- Aligning logical indices across two sub-panels required custom data merging/padding. 

## 7. Next Steps
- [ ] Proceed to implement the next valuation metric (e.g., MVRV Z-Score, Puell Multiple) following this established component architecture.
- [ ] Build the overarching `ValuationOscillator` aggregation engine.

## 8. Notes
The integration of `lightweight-charts` makes the project feel significantly more premium and fulfills the ubiquitous language requirement of treating the components as "parameter playgrounds". The time-alignment workaround (whitespace padding) will likely be needed for ALL future sub-panels, so it might be worth refactoring into a reusable `useSyncedData()` hook.
