## MODIFIED Requirements

### Requirement: Composite Oscillator Calculation
The `/api/composite` endpoint SHALL compute the composite oscillator value per date by first calculating `raw_composite = AVG(normalized_value)` across all indicators, then applying a monotonic rescaling transformation using parameters from the `audit_composite_params` table. The rescaling SHALL map the historical distribution of raw composite values to the full [-2, +2] range using piecewise linear interpolation at the 2.5th, 50th, and 97.5th percentile anchor points.

#### Scenario: Composite with rescaling
- **WHEN** a GET request is made to `/api/composite` and `audit_composite_params` contains valid parameters
- **THEN** each row's `composite_value` SHALL be the rescaled value, and the response SHALL also include `raw_composite_value` for transparency

#### Scenario: Composite without rescaling (fallback)
- **WHEN** a GET request is made to `/api/composite` but no `audit_composite_params` entry exists
- **THEN** the `composite_value` SHALL be the raw `AVG(normalized_value)` (backward compatible behavior)
