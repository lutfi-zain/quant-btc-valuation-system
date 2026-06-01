# statistical-audit Specification

## Purpose
This specification defines the requirements for statistical validation, auditing, correlation checks, and adaptive composite rescaling of the Bitcoin cycle valuation components.

## Requirements

### Requirement: Distribution Analysis per Indicator
The system SHALL compute and store distribution statistics for each indicator's `normalized_value` time series from the `timeseries_metrics` table. Statistics SHALL include: count, mean, standard deviation, skewness, kurtosis, percentiles (2.5th, 5th, 25th, 50th, 75th, 95th, 97.5th), min, max, and the percentage of data points at the ±2 boundaries.

#### Scenario: Running distribution analysis
- **WHEN** the audit runner executes distribution analysis for all indicators
- **THEN** for each indicator with data in `timeseries_metrics`, the system SHALL compute all statistics and store them in the `audit_indicator_stats` table with the current `run_date`

#### Scenario: Indicator with insufficient data
- **WHEN** an indicator has fewer than 30 data points in `timeseries_metrics`
- **THEN** the system SHALL still compute available statistics but flag the indicator with a `data_insufficient` warning in the results

### Requirement: Threshold Validation
The system SHALL validate each indicator's threshold configuration in `metric_config` by comparing thresholds against the actual data distribution. For each indicator, the system SHALL report whether the configured thresholds correspond to reasonable percentile boundaries.

#### Scenario: Well-calibrated thresholds
- **WHEN** an indicator's `t_plus_2` threshold maps to approximately the top 2.5% of raw values and `t_minus_2` maps to the bottom 2.5%
- **THEN** the validation SHALL report `status: "well_calibrated"` for that indicator

#### Scenario: Over-conservative thresholds
- **WHEN** an indicator's extreme thresholds (`t_plus_2`, `t_minus_2`) have never been reached in the historical data
- **THEN** the validation SHALL report `status: "over_conservative"` and suggest adjusted thresholds based on the 2.5th and 97.5th percentiles of the raw data

#### Scenario: Generating threshold suggestions
- **WHEN** threshold validation runs for an indicator
- **THEN** the system SHALL output suggested threshold values based on percentile analysis: `suggested_t_plus_2` = raw value at the historical High Value percentile, `suggested_t_minus_2` = raw value at the historical Low Value percentile

### Requirement: Correlation Matrix
The system SHALL compute pairwise correlation coefficients (both Pearson and Spearman) between all indicator pairs using their `normalized_value` time series, aligned by date.

#### Scenario: Computing correlations
- **WHEN** the audit runner executes correlation analysis
- **THEN** for each pair of indicators (i, j) where i < j, the system SHALL compute Pearson and Spearman correlation coefficients using date-aligned data and store them in `audit_correlation_matrix`

#### Scenario: Identifying highly correlated pairs
- **WHEN** two indicators have |Pearson correlation| > 0.85 or |Spearman correlation| > 0.85
- **THEN** the system SHALL flag these pairs as `highly_correlated` in the audit results

### Requirement: Composite Rescaling
The system SHALL compute rescaling parameters from the historical distribution of `raw_composite = AVG(normalized_value)` per date, and store them in `audit_composite_params`.

#### Scenario: Fitting rescaling parameters
- **WHEN** the audit runner computes composite rescaling parameters
- **THEN** the system SHALL calculate the 2.5th percentile, 50th percentile, and 97.5th percentile of the historical raw composite values, and store them as `raw_p2_5`, `raw_p50`, `raw_p97_5` in `audit_composite_params`

#### Scenario: Applying rescaling to composite values
- **WHEN** the `/api/composite` endpoint returns composite values
- **THEN** each `composite_value` SHALL be rescaled using piecewise linear interpolation:
  - raw values at or below `raw_p2_5` → mapped to -2
  - raw values at `raw_p50` → mapped to 0
  - raw values at or above `raw_p97_5` → mapped to +2
  - values between anchor points → linearly interpolated

#### Scenario: No rescaling parameters exist
- **WHEN** the `/api/composite` endpoint is called but no entry exists in `audit_composite_params`
- **THEN** the system SHALL return raw `AVG(normalized_value)` without rescaling (backward compatible)

### Requirement: Audit Runner
The system SHALL provide a CLI command and Python function to execute the full audit pipeline: distribution analysis → threshold validation → correlation analysis → composite rescaling parameter fitting.

#### Scenario: Running full audit via CLI
- **WHEN** the user executes `python -m quant.audit.runner --db-path database/metrics.db`
- **THEN** the system SHALL execute all audit steps sequentially, store results in their respective tables, and print a summary report

#### Scenario: Running audit programmatically
- **WHEN** `run_audit(db_path)` is called from Python code
- **THEN** the function SHALL return a dict containing `indicator_stats`, `threshold_validation`, `correlations`, and `composite_params`

### Requirement: Audit API Endpoint
The system SHALL expose audit results via `GET /api/audit/summary`.

#### Scenario: Fetching audit summary
- **WHEN** a GET request is made to `/api/audit/summary`
- **THEN** the response SHALL be a JSON object containing:
  - `indicator_stats`: array of per-indicator distribution statistics from the latest `run_date`
  - `correlations`: array of pairwise correlation entries from the latest `run_date`
  - `composite_params`: the latest rescaling parameters object
  - `run_date`: the date of the latest audit run

#### Scenario: No audit data exists
- **WHEN** a GET request is made to `/api/audit/summary` but no audit has been run
- **THEN** the response SHALL return `{ "error": "No audit data available. Run the audit pipeline first." }` with HTTP status 404

### Requirement: Audit Dashboard Panel
The frontend SHALL provide an audit summary panel accessible from the dashboard that displays indicator statistics, correlation information, and composite range analysis.

#### Scenario: Viewing distribution stats
- **WHEN** the user navigates to the audit panel
- **THEN** the system SHALL display a table showing each indicator's mean, std, skewness, kurtosis, and percentage of data points at ±2 boundaries

#### Scenario: Viewing correlation heatmap
- **WHEN** the user navigates to the audit panel
- **THEN** the system SHALL render a heatmap visualization of the correlation matrix with color coding from -1 (negative correlation) to +1 (positive correlation)

#### Scenario: Viewing composite range coverage
- **WHEN** the user navigates to the audit panel
- **THEN** the system SHALL display a histogram of raw composite values and the rescaled composite values, showing the before/after range improvement
