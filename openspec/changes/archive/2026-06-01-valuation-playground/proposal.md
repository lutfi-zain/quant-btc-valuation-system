## Why

The current system automatically normalizes metrics into a strict -2 to +2 Z-score bound on the backend. However, researchers need a visual "playground" on the frontend to manually adjust threshold boundaries (-2, -1, 0, +1, +2) for raw metrics. This allows users to visually define what constitutes an "overvalued" or "undervalued" state based on historical raw data instead of relying purely on a fixed statistical normalizer. This change bridges the gap between static statistical models and interactive quantitative research.

## What Changes

- Introduction of a "Playground UI" for raw metrics.
- The UI will display three synchronized charts:
  1. **BTC OHLC Chart**: Displays the historical Bitcoin OHLC price data.
  2. **Playground Chart**: Displays the raw un-normalized metric data (e.g., raw AVIV ratio) along with interactive, draggable, or manually adjustable threshold lines (-2, -1, 0, +1, +2).
  3. **Valuation Output Chart**: Displays the resulting bounded valuation oscillator (-2 to +2) dynamically computed based on the user's defined thresholds.
- Capability to save these adjusted thresholds to the backend/database so they persist as the chosen parameters for that specific component model.

## Capabilities

### New Capabilities
- `metric-playground`: Interactive frontend charts for manual threshold adjustment and valuation visualization.
- `playground-config`: Backend endpoints and SQLite schema updates to save and retrieve user-defined threshold configurations per metric.

### Modified Capabilities
- `<existing-name>`: (None changing at the requirement level currently, purely additions)

## Impact

- **Frontend**: Adds state management for manual threshold configurations, new dynamic charting components using lightweight-charts.
- **Backend**: Adds new Hono API routes to save/load threshold configurations for each metric.
- **Database**: Adds a configuration table to store user thresholds per metric.
- **Quant**: Existing `normalize` functions may be bypassed or enhanced when user-defined thresholds are supplied, re-mapping raw data to -2/+2 based on custom threshold ranges instead of global standard deviations.
