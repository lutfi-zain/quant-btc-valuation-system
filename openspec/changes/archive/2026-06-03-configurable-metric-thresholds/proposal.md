## Why

Metric thresholds (-2, -1, 0, +1, +2 SD bands) are currently hardcoded in both `backend/index.ts` (SEED_DATA, lines 119–137) and `quant/seed_metric_config.py` (SEED_DATA, lines 9–49). Every server restart or seed execution **overwrites** any user-customized values with the hardcoded defaults via `INSERT OR REPLACE`. This means users cannot persistently tune thresholds from the frontend—any changes saved via `POST /api/metrics/config` are silently lost on the next restart.

Researchers need to interactively adjust threshold boundaries per metric to calibrate the valuation model against evolving market conditions, without redeploying code or editing Python/TypeScript source files.

## What Changes

- **Stop overwriting user thresholds on startup**: Change the backend seed logic from `INSERT OR REPLACE` to `INSERT OR IGNORE`, so user-saved thresholds are preserved across restarts. Seed data only fills in metrics that have no config yet.
- **Add threshold editor UI in MetricDetail**: Add an inline editable threshold form in the RAW METRIC VALUE CHART panel of `MetricDetail.tsx`, allowing users to modify all 5 threshold levels (-2, -1, 0, +1, +2) per metric.
- **Add Reset to Defaults**: A reset button that restores a metric's thresholds to the original seed values.
- **Live recalculation on save**: When thresholds are saved, trigger backend recalculation of `normalized_value` for that metric's entire timeseries using the new thresholds, then refresh the DYNAMIC SCORE chart and COMPOSITE OSCILLATOR.
- **New backend endpoint for threshold-driven renormalization**: A `POST /api/metrics/renormalize/:metric_name` endpoint that recalculates all `normalized_value` entries in `timeseries_metrics` for a given metric using the current `metric_config` thresholds.

## Capabilities

### New Capabilities
- `threshold-editor`: Frontend threshold configuration UI with inline editing, save, reset-to-defaults, and live chart updates in the MetricDetail view.
- `metric-renormalization`: Backend endpoint and logic to recalculate normalized_value for a metric's full timeseries when thresholds change, propagating updates to the composite oscillator.

### Modified Capabilities
- `metric-normalization`: The seed behavior changes from `INSERT OR REPLACE` to `INSERT OR IGNORE` to preserve user-customized thresholds. Default seed values are also exposed via a new API for the reset feature.

## Impact

- **Backend** (`backend/index.ts`): Seed logic changes from `INSERT OR REPLACE` to `INSERT OR IGNORE`. New `POST /api/metrics/renormalize/:metric_name` endpoint. New `GET /api/metrics/config/defaults` endpoint for reset values.
- **Python** (`quant/seed_metric_config.py`): Same `INSERT OR IGNORE` change. New `renormalize_metric()` function in `quant/components/normalization.py` to recalculate the full timeseries.
- **Frontend** (`frontend/src/components/MetricDetail.tsx`): New `ThresholdEditor` component with editable inputs, save/reset buttons, and state management to refresh chart data after save.
- **Database** (`metric_config` table): Schema unchanged. Behavioral change only (seed idempotency strategy).
- **Existing API**: `POST /api/metrics/config` continues to work unchanged. `GET /api/metrics/config/:metric_name` continues to work unchanged.
