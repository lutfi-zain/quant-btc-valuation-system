# metric-playground Specification

## Purpose
TBD - created by archiving change valuation-playground. Update Purpose after archive.
## Requirements
### Requirement: Metric Playground View
The system SHALL provide a frontend view that displays three synchronized charts for a selected metric:
1. The first chart SHALL display the BTC OHLC price action.
2. The second chart SHALL display raw historical metric data along with adjustable horizontal threshold lines representing standard bounds (-2, -1, 0, +1, +2).
3. The third chart SHALL display the valuation oscillator mapped from -2 to +2 dynamically.

#### Scenario: Visualizing raw and mapped data
- **WHEN** the user navigates to the metric playground
- **THEN** the BTC OHLC chart, raw metric chart, and valuation output chart are rendered and synchronized (crosshairs and timeframe logic)

### Requirement: Dynamic Threshold Adjustment
The frontend SHALL allow the user to adjust the threshold values (-2, -1, 0, 1, 2) manually on the raw metric chart.

#### Scenario: Adjusting a threshold
- **WHEN** the user updates the input field for the +2 threshold from 10.0 to 12.0
- **THEN** the valuation output chart dynamically recalculates the mapping in real-time, reflecting the new ceiling.

### Requirement: Composite Oscillator Calculation
The `/api/composite` endpoint SHALL compute the composite oscillator value per date by first calculating `raw_composite = AVG(normalized_value)` across all indicators, then applying a monotonic rescaling transformation using parameters from the `audit_composite_params` table. The rescaling SHALL map the historical distribution of raw composite values to the full [-2, +2] range using piecewise linear interpolation at the 2.5th, 50th, and 97.5th percentile anchor points.

#### Scenario: Composite with rescaling
- **WHEN** a GET request is made to `/api/composite` and `audit_composite_params` contains valid parameters
- **THEN** each row's `composite_value` SHALL be the rescaled value, and the response SHALL also include `raw_composite_value` for transparency

#### Scenario: Composite without rescaling (fallback)
- **WHEN** a GET request is made to `/api/composite` but no `audit_composite_params` entry exists
- **THEN** the `composite_value` SHALL be the raw `AVG(normalized_value)` (backward compatible behavior)
