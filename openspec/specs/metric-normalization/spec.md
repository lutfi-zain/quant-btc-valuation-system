# metric-normalization Specification

## Purpose
Defines the normalization engine that maps raw indicator values to the system's -2 to +2 valuation oscillator scale. The engine uses piecewise linear interpolation between expert-defined SD-band thresholds stored in the `metric_config` table, handles three metric direction types (normal, inverted, and one-sided), and preserves user-customized configurations across database seeding and backend restarts.

## Requirements

### Requirement: Piecewise Linear Interpolation Normalization

The system SHALL provide a normalization function at `quant/components/normalization.py` that maps any raw metric value to a normalized value in the range [-2, +2] using piecewise linear interpolation between threshold boundaries.

The function signature SHALL be:
```python
def normalize(raw_value: float, t_plus_2: float | None, t_plus_1: float | None, t_minus_1: float | None, t_minus_2: float | None) -> float
```

The normalization regions SHALL be:
1. Raw value at or beyond the +2SD boundary → normalized = **+2** (High Value / Undervalued / Bottom)
2. Raw value between +2SD and +1SD → linear interpolation producing a value between **+2** and **+1**
3. Raw value between +1SD and -1SD → linear interpolation producing a value between **+1** and **-1**
4. Raw value between -1SD and -2SD → linear interpolation producing a value between **-1** and **-2**
5. Raw value at or beyond the -2SD boundary → normalized = **-2** (Low Value / Overvalued / Top)

The function MUST clamp the output to the [-2, +2] range. Values outside the outermost thresholds SHALL be clamped to -2 or +2 respectively.

The function MUST auto-detect metric direction from the threshold values:
- If `t_plus_2 < t_minus_2`, the metric is **normal** (low raw value = high valuation score)
- If `t_plus_2 > t_minus_2`, the metric is **inverted** (high raw value = high valuation score)

#### Scenario: Normal metric in the +2 region (extreme undervaluation)
- **WHEN** `normalize(raw_value=-2.5, t_plus_2=-2, t_plus_1=-1, t_minus_1=1, t_minus_2=2)` is called (AVIV Ratio-Z thresholds)
- **THEN** the result SHALL be `+2.0` (clamped at the high-value ceiling)

#### Scenario: Normal metric between +2SD and +1SD
- **WHEN** `normalize(raw_value=-1.5, t_plus_2=-2, t_plus_1=-1, t_minus_1=1, t_minus_2=2)` is called
- **THEN** the result SHALL be `+1.5` (linear interpolation: midpoint between +2SD and +1SD maps to midpoint between +2 and +1)

#### Scenario: Normal metric in the neutral zone between +1SD and -1SD
- **WHEN** `normalize(raw_value=0.0, t_plus_2=-2, t_plus_1=-1, t_minus_1=1, t_minus_2=2)` is called
- **THEN** the result SHALL be `0.0` (midpoint of the neutral zone maps to zero)

#### Scenario: Normal metric between -1SD and -2SD
- **WHEN** `normalize(raw_value=1.5, t_plus_2=-2, t_plus_1=-1, t_minus_1=1, t_minus_2=2)` is called
- **THEN** the result SHALL be `-1.5` (linear interpolation in the overvaluation zone)

#### Scenario: Normal metric in the -2 region (extreme overvaluation)
- **WHEN** `normalize(raw_value=3.0, t_plus_2=-2, t_plus_1=-1, t_minus_1=1, t_minus_2=2)` is called
- **THEN** the result SHALL be `-2.0` (clamped at the low-value floor)

#### Scenario: MVRV-Z near bottom boundary
- **WHEN** `normalize(raw_value=0.16, t_plus_2=0.15, t_plus_1=0.17, t_minus_1=4.6, t_minus_2=6.65)` is called
- **THEN** the result SHALL be `+1.5` (0.16 is the midpoint between 0.15 and 0.17, mapping to midpoint between +2 and +1)

#### Scenario: MVRV-Z in the overvalued zone
- **WHEN** `normalize(raw_value=5.625, t_plus_2=0.15, t_plus_1=0.17, t_minus_1=4.6, t_minus_2=6.65)` is called
- **THEN** the result SHALL be `-1.5` (5.625 is the midpoint between 4.6 and 6.65, mapping to midpoint between -1 and -2)

#### Scenario: Exact threshold boundary value
- **WHEN** `normalize(raw_value=-1.0, t_plus_2=-2, t_plus_1=-1, t_minus_1=1, t_minus_2=2)` is called
- **THEN** the result SHALL be `+1.0` (exact +1SD threshold maps exactly to +1)

### Requirement: Inverted Metric Normalization

The system SHALL support inverted metrics where higher raw values indicate higher valuation (bottom signals). For inverted metrics, `t_plus_2 > t_minus_2`.

The normalization function MUST detect inverted direction automatically by comparing `t_plus_2` and `t_minus_2`:
- When `t_plus_2 > t_minus_2`, the mapping is inverted: raw values at or above `t_plus_2` yield `+2`, and raw values at or below `t_minus_2` yield `-2`.

#### Scenario: Inverted metric at the high-value boundary (Terminal Price Ratio)
- **WHEN** `normalize(raw_value=1.2, t_plus_2=1, t_plus_1=0.75, t_minus_1=0.25, t_minus_2=0.17)` is called
- **THEN** the result SHALL be `+2.0` (raw value above the +2SD threshold of 1.0, clamped to +2)

#### Scenario: Inverted metric between +2SD and +1SD (Terminal Price Ratio)
- **WHEN** `normalize(raw_value=0.875, t_plus_2=1, t_plus_1=0.75, t_minus_1=0.25, t_minus_2=0.17)` is called
- **THEN** the result SHALL be `+1.5` (midpoint between 1.0 and 0.75 maps to midpoint between +2 and +1)

#### Scenario: Inverted metric in the overvalued zone (Terminal Price Ratio)
- **WHEN** `normalize(raw_value=0.21, t_plus_2=1, t_plus_1=0.75, t_minus_1=0.25, t_minus_2=0.17)` is called
- **THEN** the result SHALL be `-1.5` (midpoint between 0.25 and 0.17 maps to midpoint between -1 and -2)

#### Scenario: Inverted metric beyond -2SD (Terminal Price Ratio)
- **WHEN** `normalize(raw_value=0.10, t_plus_2=1, t_plus_1=0.75, t_minus_1=0.25, t_minus_2=0.17)` is called
- **THEN** the result SHALL be `-2.0` (clamped at the low-value floor)

### Requirement: One-Sided Metric Normalization

The system SHALL support one-sided metrics that only define thresholds for one direction (bottom-only or top-only). Missing thresholds SHALL be represented as `None` (Python) / `NULL` (SQLite).

For **bottom-only** metrics (only `t_plus_2` and `t_plus_1` are defined):
- When the raw value is in the bottom zone (at or beyond `t_plus_2`), normalize to `+2`
- When the raw value is between `t_plus_2` and `t_plus_1`, interpolate between `+2` and `+1`
- When the raw value is above `t_plus_1` (outside the defined bottom zone), the result SHALL be `None` (Python) / `null` (TypeScript) / `NULL` (SQLite), which excludes it from the composite average.

For **top-only** metrics (only `t_minus_1` and `t_minus_2` are defined):
- When the raw value is in the top zone (at or beyond `t_minus_2`), normalize to `-2`
- When the raw value is between `t_minus_1` and `t_minus_2`, interpolate between `-1` and `-2`
- When the raw value is below `t_minus_1` (outside the defined top zone), the result SHALL be `None` (Python) / `null` (TypeScript) / `NULL` (SQLite), which excludes it from the composite average.

#### Scenario: Bottom-only metric in the bottom zone (CVDD Ratio)
- **WHEN** `normalize(raw_value=1.1, t_plus_2=1.3, t_plus_1=1.6, t_minus_1=None, t_minus_2=None)` is called
- **THEN** the result SHALL be `+2.0` (raw value below +2SD threshold of 1.3, clamped to +2)

#### Scenario: Bottom-only metric between +2SD and +1SD (CVDD Ratio)
- **WHEN** `normalize(raw_value=1.45, t_plus_2=1.3, t_plus_1=1.6, t_minus_1=None, t_minus_2=None)` is called
- **THEN** the result SHALL be `+1.5` (midpoint between 1.3 and 1.6 maps to midpoint between +2 and +1)

#### Scenario: Bottom-only metric outside defined zone (CVDD Ratio)
- **WHEN** `normalize(raw_value=2.5, t_plus_2=1.3, t_plus_1=1.6, t_minus_1=None, t_minus_2=None)` is called
- **THEN** the result SHALL be `NaN` (or `None`/`NULL` representing exclusion)

#### Scenario: Bottom-only metric — Williams %R in the bottom zone
- **WHEN** `normalize(raw_value=-85, t_plus_2=-80, t_plus_1=-70, t_minus_1=None, t_minus_2=None)` is called
- **THEN** the result SHALL be `+2.0` (raw value below -80, clamped to +2 — extreme bottom signal)

#### Scenario: Bottom-only metric — Williams %R outside defined zone
- **WHEN** `normalize(raw_value=-30, t_plus_2=-80, t_plus_1=-70, t_minus_1=None, t_minus_2=None)` is called
- **THEN** the result SHALL be `NaN` (or `None`/`NULL` representing exclusion)

#### Scenario: Top-only metric in the top zone (Unrealized Sell Risk)
- **WHEN** `normalize(raw_value=2.5, t_plus_2=None, t_plus_1=None, t_minus_1=1.8, t_minus_2=2.2)` is called
- **THEN** the result SHALL be `-2.0` (raw value above -2SD threshold of 2.2, clamped to -2)

#### Scenario: Top-only metric between -1SD and -2SD (Unrealized Sell Risk)
- **WHEN** `normalize(raw_value=2.0, t_plus_2=None, t_plus_1=None, t_minus_1=1.8, t_minus_2=2.2)` is called
- **THEN** the result SHALL be `-1.5` (midpoint between 1.8 and 2.2 maps to midpoint between -1 and -2)

#### Scenario: Top-only metric outside defined zone (Unrealized Sell Risk)
- **WHEN** `normalize(raw_value=1.0, t_plus_2=None, t_plus_1=None, t_minus_1=1.8, t_minus_2=2.2)` is called
- **THEN** the result SHALL be `NaN` (or `None`/`NULL` representing exclusion)

### Requirement: Threshold Loading from Database

The system SHALL load normalization thresholds from the `metric_config` table in SQLite. The table schema is:

```sql
CREATE TABLE metric_config (
    metric_name TEXT PRIMARY KEY,
    t_minus_2 REAL,  -- -2SD threshold (Low Value / Top)
    t_minus_1 REAL,  -- -1SD threshold
    t_zero REAL,     -- neutral reference (informational, not used in normalization)
    t_plus_1 REAL,   -- +1SD threshold
    t_plus_2 REAL    -- +2SD threshold (High Value / Bottom)
);
```

The normalization module SHALL provide a function to load thresholds:
```python
def load_thresholds(db_path: str, metric_name: str) -> dict
```

The returned dict SHALL contain keys: `t_plus_2`, `t_plus_1`, `t_minus_1`, `t_minus_2`. The `t_zero` column is informational and SHALL NOT be used in normalization calculations. `None` values in the database (`NULL`) SHALL be preserved as `None` in the returned dict.

The function MUST raise a `ValueError` if the requested `metric_name` does not exist in the `metric_config` table.

#### Scenario: Loading thresholds for a full metric
- **WHEN** `load_thresholds(db_path, "mvrv_z")` is called and the `metric_config` table contains a row `("mvrv_z", 6.65, 4.6, NULL, 0.17, 0.15)`
- **THEN** the result SHALL be `{"t_plus_2": 0.15, "t_plus_1": 0.17, "t_minus_1": 4.6, "t_minus_2": 6.65}`

#### Scenario: Loading thresholds for a one-sided metric
- **WHEN** `load_thresholds(db_path, "cvdd_ratio")` is called and the `metric_config` table contains a row `("cvdd_ratio", NULL, NULL, NULL, 1.6, 1.3)`
- **THEN** the result SHALL be `{"t_plus_2": 1.3, "t_plus_1": 1.6, "t_minus_1": None, "t_minus_2": None}`

#### Scenario: Loading thresholds for a missing metric
- **WHEN** `load_thresholds(db_path, "nonexistent_metric")` is called and no row with `metric_name = "nonexistent_metric"` exists
- **THEN** the function SHALL raise a `ValueError` with a message indicating the metric was not found

### Requirement: Normalize with Database Lookup

The system SHALL provide a convenience function that combines threshold loading and normalization in a single call:
```python
def normalize_metric(db_path: str, metric_name: str, raw_value: float) -> float
```

This function SHALL load thresholds from `metric_config` using `load_thresholds()`, then call `normalize()` with the loaded thresholds to produce the normalized value.

#### Scenario: End-to-end normalization for Ahr999
- **WHEN** `normalize_metric(db_path, "ahr999", 0.575)` is called and the `metric_config` table contains thresholds `(t_minus_2=5.47, t_minus_1=2.9, t_zero=NULL, t_plus_1=0.7, t_plus_2=0.45)`
- **THEN** the result SHALL be `+1.5` (0.575 is the midpoint between 0.45 and 0.7, interpolating between +2 and +1)

### Requirement: Seed Data for All 17 Metric Thresholds

The system SHALL pre-load all 17 metric threshold configurations into the `metric_config` table via a database seeder script or migration. The seeder MUST be idempotent (safe to run multiple times without duplicating data).

The seeder SHALL use `INSERT OR IGNORE` (instead of `INSERT OR REPLACE`) to ensure that existing user-customized threshold values are never overwritten. Only metrics that do not yet have a row in `metric_config` SHALL be inserted.

The backend startup seed logic in `backend/index.ts` SHALL also use `INSERT OR IGNORE` to prevent overwriting user-modified thresholds on every server restart.

The seed data SHALL contain the following exact threshold values (unchanged from the original spec):

| metric_name | t_plus_2 | t_plus_1 | t_zero | t_minus_1 | t_minus_2 |
|---|---|---|---|---|---|
| aviv_ratio_z | -2 | -1 | NULL | 1 | 2 |
| aviv_nupl | -0.6 | -0.3 | NULL | 0.3 | 0.5 |
| cvdd_ratio | 1.3 | 1.6 | NULL | NULL | NULL |
| mvrv_z | 0.15 | 0.17 | NULL | 4.6 | 6.65 |
| lth_sth_sopr_ratio | 0.73 | 0.99 | NULL | 3.2 | 6.9 |
| terminal_price_ratio | 1 | 0.75 | NULL | 0.25 | 0.17 |
| unrealized_sell_risk | NULL | NULL | NULL | 1.8 | 2.2 |
| sharpe_52w | -20 | -10 | NULL | 42 | 53 |
| pi_cycle_top_ratio | 0.35 | 0.45 | NULL | 0.7 | 0.95 |
| vpli | 45 | 50 | NULL | 70 | 80 |
| risk_metrics | 0.13 | 0.33 | NULL | 0.75 | 0.85 |
| dvrsi | 42 | 50 | NULL | 65 | 73 |
| williams_r | -80 | -70 | NULL | NULL | NULL |
| two_year_ma_ratio | 0.7 | 1 | NULL | 3 | 4.2 |
| ahr999 | 0.45 | 0.7 | NULL | 2.9 | 5.47 |
| fear_greed_og | 30 | 50 | NULL | 60 | 70 |
| fear_greed_cmc | 20 | 40 | NULL | 60 | 80 |

The seeder SHALL be runnable as:
```bash
python -m quant.seed_metric_config
```

#### Scenario: Seeding a fresh database

- **WHEN** the seeder script is executed against a database with an empty `metric_config` table
- **THEN** the table SHALL contain exactly 17 rows, one for each metric, with the threshold values specified above

#### Scenario: Seeding is idempotent and preserves user changes

- **WHEN** the user has modified thresholds for `mvrv_z` to custom values `{t_plus_2: 0.2, t_plus_1: 0.25, t_minus_1: 5.0, t_minus_2: 7.0}`
- **AND** the seeder script is executed
- **THEN** the `mvrv_z` row SHALL retain the user's custom values `{t_plus_2: 0.2, t_plus_1: 0.25, t_minus_1: 5.0, t_minus_2: 7.0}`
- **THEN** the row SHALL NOT be overwritten with the seed defaults

#### Scenario: New metric is seeded alongside existing customized metrics

- **WHEN** the `metric_config` table contains 16 rows (with some user-customized values)
- **AND** a new 17th metric is added to the SEED_DATA constant
- **AND** the seeder script is executed
- **THEN** only the new 17th metric SHALL be inserted
- **THEN** the existing 16 rows (including user-customized ones) SHALL be unchanged

#### Scenario: Backend startup does not overwrite user thresholds

- **WHEN** the user has saved custom thresholds for `terminal_price_ratio` via `POST /api/metrics/config`
- **AND** the Hono backend server is restarted
- **THEN** the `terminal_price_ratio` row in `metric_config` SHALL retain the user's custom values
- **THEN** the seed logic SHALL NOT replace the custom values with defaults

#### Scenario: Verifying CVDD bottom-only seed data
- **WHEN** the row for `cvdd_ratio` is queried after seeding
- **THEN** `t_plus_2` SHALL be `1.3`, `t_plus_1` SHALL be `1.6`, and `t_minus_1` and `t_minus_2` SHALL both be `NULL`

#### Scenario: Verifying Unrealized Sell Risk top-only seed data
- **WHEN** the row for `unrealized_sell_risk` is queried after seeding
- **THEN** `t_plus_2` and `t_plus_1` SHALL both be `NULL`, `t_minus_1` SHALL be `1.8`, and `t_minus_2` SHALL be `2.2`

#### Scenario: Verifying Terminal Price Ratio inverted seed data
- **WHEN** the row for `terminal_price_ratio` is queried after seeding
- **THEN** `t_plus_2` SHALL be `1` (greater than `t_minus_2` of `0.17`), confirming inverted direction where higher raw value = higher valuation score

### Requirement: NaN and Missing Value Handling

The normalization function MUST handle edge cases for invalid or missing input gracefully.

- If `raw_value` is `NaN` or `None`, the function SHALL return `NaN` (not raise an exception).
- If all four thresholds are `None`, the function SHALL return `0.0` (neutral — no normalization is possible).

#### Scenario: NaN raw value
- **WHEN** `normalize(raw_value=float('nan'), t_plus_2=-2, t_plus_1=-1, t_minus_1=1, t_minus_2=2)` is called
- **THEN** the result SHALL be `NaN`

#### Scenario: None raw value
- **WHEN** `normalize(raw_value=None, t_plus_2=-2, t_plus_1=-1, t_minus_1=1, t_minus_2=2)` is called
- **THEN** the result SHALL be `NaN`

#### Scenario: All thresholds are None
- **WHEN** `normalize(raw_value=5.0, t_plus_2=None, t_plus_1=None, t_minus_1=None, t_minus_2=None)` is called
- **THEN** the result SHALL be `0.0`

### Requirement: Load Metric Config (extends playground-config)

The existing GET `/api/metrics/config/:metric_name` endpoint SHALL continue to serve threshold data. The response payload is unchanged. This spec adds the requirement that the endpoint MUST return valid data for all 17 seeded metrics.

#### Scenario: Loading config for a seeded metric via API
- **WHEN** a GET request is sent to `/api/metrics/config/fear_greed_og`
- **THEN** the response SHALL be HTTP 200 with JSON body:
```json
{
  "metric_name": "fear_greed_og",
  "t_minus_2": 70,
  "t_minus_1": 60,
  "t_zero": null,
  "t_plus_1": 50,
  "t_plus_2": 30
}
```

#### Scenario: Loading config for a one-sided seeded metric via API
- **WHEN** a GET request is sent to `/api/metrics/config/williams_r`
- **THEN** the response SHALL be HTTP 200 with JSON body:
```json
{
  "metric_name": "williams_r",
  "t_minus_2": null,
  "t_minus_1": null,
  "t_zero": null,
  "t_plus_1": -70,
  "t_plus_2": -80
}
```
