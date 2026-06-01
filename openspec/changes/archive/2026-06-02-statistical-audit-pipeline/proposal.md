## Why

The composite oscillator currently computes `AVG(normalized_value)` across all 17 indicators, which mathematically constrains the output range to approximately [-0.86, +1.2] instead of the target [-2, +2]. This occurs because:

1. **Mean averaging suppresses extremes**: Unless all 17 indicators simultaneously hit ±2, the average will always be diluted. This is a fundamental statistical property — the variance of a mean decreases with sample size.
2. **Threshold calibration is unvalidated**: The piecewise-linear thresholds in `metric_config` were set manually based on historical observation without formal statistical validation (distribution fitting, percentile analysis, or coherency testing).
3. **No correlation/redundancy analysis**: Highly correlated indicators (e.g., AVIV Ratio-Z and MVRV-Z both measure realized value ratios) may be diluting the signal rather than adding independent information.
4. **No audit pipeline exists**: There is no automated way to validate that individual indicators are correctly normalized, that thresholds are well-calibrated, or that the composite oscillator behaves as designed.

The system needs a statistical audit framework and a corrected aggregation method to ensure the composite oscillator reliably reaches ±2 during genuine cycle extremes (historical tops and bottoms).

## What Changes

- **Add a statistical audit module** (`quant/audit/`) that analyzes each indicator's distribution, validates threshold calibration against historical data, and tests inter-indicator coherency.
- **Replace simple averaging with a statistically robust aggregation method** that preserves extreme signals. The composite will use **rescaled mean aggregation**: compute the raw mean, then rescale it using the historical distribution of the mean itself (percentile-based or z-score-based remapping) so the composite oscillator achieves the full [-2, +2] range at historical cycle extremes.
- **Add threshold recalibration tooling** that uses percentile-based analysis (e.g., 2.5th/5th/95th/97.5th percentiles) to validate or suggest threshold adjustments for each indicator.
- **Add correlation matrix and redundancy analysis** to identify which indicators provide independent vs. redundant signals.
- **Store audit results in SQLite** for historical tracking and dashboard display.
- **Add audit summary API endpoint** to expose audit results to the frontend.
- **Add an audit dashboard panel** showing per-indicator distribution stats, correlation heatmap, and composite range coverage.

## Capabilities

### New Capabilities
- `statistical-audit`: Statistical audit framework for validating indicator distributions, threshold calibration, inter-indicator correlation, and composite oscillator range coverage. Includes Python audit module, SQLite storage, API endpoints, and frontend dashboard panel.

### Modified Capabilities
- `metric-playground`: The composite oscillator calculation will change from simple `AVG()` to rescaled aggregation. The `/api/composite` endpoint response shape remains the same but values will differ.

## Impact

- **Python (`quant/`)**: New `quant/audit/` module with distribution analysis, threshold validation, correlation analysis, and composite rescaling logic. Modifications to the normalization pipeline to integrate rescaled composite.
- **Database (`database/`)**: New tables: `audit_results`, `correlation_matrix`, `composite_scaling_params`. No changes to existing tables.
- **Backend (`backend/`)**: New `/api/audit/summary` endpoint. Modified `/api/composite` endpoint to use rescaled aggregation.
- **Frontend (`frontend/`)**: New audit dashboard panel with distribution histograms, correlation heatmap, and range coverage visualization.
- **Dependencies**: `scipy` and `numpy` for statistical computations (both likely already available, or add to `requirements.txt`).
