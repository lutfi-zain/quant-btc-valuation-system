# metric-renormalization Specification

## Purpose
Defines the backend endpoint and logic for recalculating all `normalized_value` entries in `timeseries_metrics` for a specific metric when its threshold configuration changes. This enables live threshold tuning from the frontend without re-running the full data pipeline.

## Requirements

### Requirement: Renormalization API Endpoint

The Hono backend SHALL expose a `POST /api/metrics/renormalize/:metric_name` endpoint that recalculates the `normalized_value` for every row of the specified metric in the `timeseries_metrics` table using the current thresholds from `metric_config`.

The endpoint SHALL:
1. Load the current thresholds from `metric_config` for the given `metric_name`
2. Read all rows from `timeseries_metrics` where `metric_name` matches
3. For each row, apply the piecewise linear interpolation normalization to the `raw_value` using the loaded thresholds
4. Update the `normalized_value` column for each row with the newly computed value
5. Return a summary of the operation

The normalization logic SHALL be identical to the Python `normalize()` function in `quant/components/normalization.py`, supporting:
- Normal direction metrics (t_plus_2 < t_minus_2)
- Inverted direction metrics (t_plus_2 > t_minus_2)
- Bottom-only metrics (t_minus_1 and t_minus_2 are NULL)
- Top-only metrics (t_plus_1 and t_plus_2 are NULL)
- NaN/NULL raw_value handling (produces NULL normalized_value)

#### Scenario: Successful renormalization of a full metric

- **WHEN** a client sends `POST /api/metrics/renormalize/terminal_price_ratio`
- **AND** `metric_config` contains thresholds for `terminal_price_ratio`
- **AND** `timeseries_metrics` contains 3000 rows for `terminal_price_ratio`
- **THEN** the API SHALL respond with HTTP status 200
- **THEN** the response JSON SHALL contain:
```json
{
  "success": true,
  "metric_name": "terminal_price_ratio",
  "rows_updated": 3000
}
```
- **THEN** every `normalized_value` in `timeseries_metrics` for `terminal_price_ratio` SHALL be recalculated using the current `metric_config` thresholds

#### Scenario: Renormalization of a metric with no config

- **WHEN** a client sends `POST /api/metrics/renormalize/nonexistent_metric`
- **AND** no row exists in `metric_config` for `nonexistent_metric`
- **THEN** the API SHALL respond with HTTP status 404
- **THEN** the response JSON SHALL contain:
```json
{
  "error": "No threshold configuration found for metric: nonexistent_metric"
}
```

#### Scenario: Renormalization of a metric with no timeseries data

- **WHEN** a client sends `POST /api/metrics/renormalize/fear_greed_cmc`
- **AND** `metric_config` contains thresholds for `fear_greed_cmc`
- **AND** `timeseries_metrics` contains 0 rows for `fear_greed_cmc`
- **THEN** the API SHALL respond with HTTP status 200
- **THEN** the response JSON SHALL contain:
```json
{
  "success": true,
  "metric_name": "fear_greed_cmc",
  "rows_updated": 0
}
```

#### Scenario: Invalid metric name

- **WHEN** a client sends `POST /api/metrics/renormalize/` (empty metric name)
- **THEN** the API SHALL respond with HTTP status 400
- **THEN** the response JSON SHALL contain `{"error": "metric_name is required"}`

### Requirement: TypeScript Normalization Function Parity

The backend SHALL implement a TypeScript `normalizeValue()` function that produces results identical to the Python `normalize()` function in `quant/components/normalization.py`.

The function signature SHALL be:
```typescript
function normalizeValue(
  rawValue: number | null,
  tPlus2: number | null,
  tPlus1: number | null,
  tMinus1: number | null,
  tMinus2: number | null
): number | null
```

The function SHALL handle all the same cases as the Python implementation:
- Auto-detect direction (normal vs inverted) from threshold values
- Support bottom-only metrics (tMinus1 and tMinus2 are null)
- Support top-only metrics (tPlus1 and tPlus2 are null)
- Return null for null rawValue
- Return 0 when all thresholds are null
- Clamp output to [-2, +2] range

#### Scenario: Normal metric normalization in TypeScript

- **WHEN** `normalizeValue(0.16, 0.15, 0.17, 4.6, 6.65)` is called (MVRV-Z thresholds)
- **THEN** the result SHALL be `1.5`

#### Scenario: Inverted metric normalization in TypeScript

- **WHEN** `normalizeValue(0.875, 1, 0.75, 0.25, 0.17)` is called (Terminal Price Ratio thresholds)
- **THEN** the result SHALL be `1.5`

#### Scenario: Bottom-only metric normalization in TypeScript

- **WHEN** `normalizeValue(1.45, 1.3, 1.6, null, null)` is called (CVDD Ratio thresholds)
- **THEN** the result SHALL be `1.5`

#### Scenario: Top-only metric normalization in TypeScript

- **WHEN** `normalizeValue(2.0, null, null, 1.8, 2.2)` is called (Unrealized Sell Risk thresholds)
- **THEN** the result SHALL be `-1.5`

#### Scenario: Null raw value in TypeScript

- **WHEN** `normalizeValue(null, 0.15, 0.17, 4.6, 6.65)` is called
- **THEN** the result SHALL be `null`

#### Scenario: All null thresholds in TypeScript

- **WHEN** `normalizeValue(5.0, null, null, null, null)` is called
- **THEN** the result SHALL be `0`

#### Scenario: Clamping at boundaries in TypeScript

- **WHEN** `normalizeValue(-5.0, -2, -1, 1, 2)` is called (beyond +2SD for normal metric)
- **THEN** the result SHALL be `2.0`

### Requirement: Renormalization is Atomic

The renormalization operation SHALL be wrapped in a database transaction.

If any error occurs during the update of normalized values, the entire operation SHALL be rolled back and no rows SHALL be modified.

#### Scenario: Transaction rollback on error

- **WHEN** renormalization is triggered for a metric with 3000 rows
- **AND** an error occurs after updating 1500 rows
- **THEN** all 3000 rows SHALL retain their original `normalized_value` (no partial updates)
- **THEN** the API SHALL respond with HTTP status 500
