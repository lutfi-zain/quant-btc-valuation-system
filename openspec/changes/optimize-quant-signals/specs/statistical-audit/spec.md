## MODIFIED Requirements

### Requirement: Composite Rescaling
The system SHALL compute rescaling parameters from the historical distribution of `raw_composite = AVG(normalized_value)` per date, and store them in `audit_composite_params`.

- The composite oscillator average `AVG(normalized_value)` SHALL exclude the `"aviv_nupl"` metric to prevent double-counting of Cointime economics parameters.
- The system SHALL only fit composite rescaling parameters on dates that contain at least 10 active components (i.e. `component_count >= 10`) to prevent low-component count early history from distorting global percentiles.

#### Scenario: Fitting rescaling parameters
- **WHEN** the audit runner computes composite rescaling parameters
- **THEN** the system SHALL calculate the 2.5th percentile, 50th percentile, and 97.5th percentile of the historical raw composite values on dates with at least 10 active components, and store them as `raw_p2_5`, `raw_p50`, `raw_p97_5` in `audit_composite_params`

#### Scenario: Applying rescaling to composite values
- **WHEN** the `/api/composite` endpoint returns composite values
- **THEN** each `composite_value` SHALL be rescaled using piecewise linear interpolation:
  - raw values at or below `raw_p2_5` → mapped to -2
  - raw values at `raw_p50` → mapped to 0
  - raw values at or above `raw_p97_5` → mapped to +2
  - values between anchor points → linearly interpolated
- **THEN** `"aviv_nupl"` SHALL be excluded from the `AVG(normalized_value)` calculation for all dates.

#### Scenario: No rescaling parameters exist
- **WHEN** the `/api/composite` endpoint is called but no entry exists in `audit_composite_params`
- **THEN** the system SHALL return raw `AVG(normalized_value)` (excluding `"aviv_nupl"`) without rescaling
