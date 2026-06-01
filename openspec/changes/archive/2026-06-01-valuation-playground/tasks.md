## 1. Database & Backend Configuration

- [x] 1.1 Create `metric_config` SQLite table in `database/db.py` to store thresholds (`metric_name`, `t_minus_2`, `t_minus_1`, `t_zero`, `t_plus_1`, `t_plus_2`).
- [x] 1.2 Implement `POST /api/metrics/config` endpoint in Hono to save user-defined thresholds (with Bun test).
- [x] 1.3 Implement `GET /api/metrics/config/:metric_name` endpoint in Hono to retrieve saved thresholds (with Bun test).

## 2. Frontend Playground UI

- [x] 2.1 Refactor `AvivRatioChart.tsx` (or abstract it) to split into a dual-chart view: Playground Chart (top) and Valuation Output Chart (bottom).
- [x] 2.2 Add UI inputs/controls to manually adjust the threshold boundaries (-2, -1, 0, 1, 2) and tie them to a local state.
- [x] 2.3 Implement the Save button that sends the current config state via `POST /api/metrics/config`.
- [x] 2.4 Implement `useEffect` to fetch existing threshold config on mount via `GET /api/metrics/config/aviv_ratio`.
- [x] 2.5 Implement fetching BTC OHLC data from `/api/metrics/btc_ohlc` and add a third chart (topmost) displaying the BTC OHLC.
- [x] 2.6 Synchronize the crosshairs and timeframe logic across all three charts (BTC OHLC, Playground, Valuation Output).

## 3. Dynamic Valuation Output

- [x] 3.1 Implement a local frontend JS function to linearly map raw data to the oscillator bound [-2, +2] dynamically based on the customized threshold arrays, bypassing the static Z-Score calculated from the backend.
- [x] 3.2 Ensure the bottom Valuation Output Chart renders the newly mapped data seamlessly as users change inputs (real-time recalculation).
- [x] 3.3 Ensure both charts have synchronized crosshairs and timeframe zoom logic via `subscribeCrosshairMove` and `subscribeVisibleLogicalRangeChange`.

## 4. Verification

- [x] 4.1 Manual user validation: Ensure dual-chart syncing works, thresholds can be adjusted in real-time, and config saves persist across browser reloads.
- [x] 4.2 Auto-verification task: 
    1. Read all artifacts to ensure zero gaps. 
    2. Verify every SHALL/MUST requirement in specs. 
    3. Run Hono locally and use `curl` to test `POST` and `GET` configuration endpoints. 
    4. Spawn parallel reviewer subagents to audit frontend code, test coverage, and backend SQLite schema adherence.
