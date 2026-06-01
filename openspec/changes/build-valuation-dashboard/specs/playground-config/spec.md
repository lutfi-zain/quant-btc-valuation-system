# playground-config Delta Specification

## MODIFIED Requirements

### Requirement: Pre-Seed All Metric Configs

The system MUST pre-seed the `metric_config` table with threshold values for all 17 supported metrics during database initialization. The pre-seeded metric names and their threshold values SHALL match the expert-defined values from `docs/components.md`:

| metric_name | t_minus_2 | t_minus_1 | t_zero | t_plus_1 | t_plus_2 |
|---|---|---|---|---|---|
| `aviv_ratio` | 2.0 | 1.0 | 0.0 | -1.0 | -2.0 |
| `aviv_nupl` | 0.5 | 0.3 | 0.0 | -0.3 | -0.6 |
| `cvdd_ratio` | null | null | null | 1.6 | 1.3 |
| `mvrv_z` | 6.65 | 4.6 | 0.0 | 0.17 | 0.15 |
| `lth_sth_sopr_ratio` | 6.9 | 3.2 | 0.0 | 0.99 | 0.73 |
| `terminal_price_ratio` | 0.17 | 0.25 | 0.0 | 0.75 | 1.0 |
| `unrealized_sell_risk` | 0.4 | 0.2 | 0.0 | null | null |
| `sharpe_ratio_52w` | 3.0 | 2.0 | 0.0 | -1.0 | -2.0 |
| `pi_cycle_top` | 1.2 | 1.0 | 0.0 | 0.65 | 0.5 |
| `vpli` | 100.0 | 80.0 | 50.0 | 20.0 | 0.0 |
| `risk_metrics` | 0.9 | 0.7 | 0.5 | 0.3 | 0.1 |
| `dvrsi` | 80.0 | 60.0 | 50.0 | 40.0 | 20.0 |
| `williams_r` | -20.0 | -40.0 | -50.0 | -60.0 | -80.0 |
| `two_year_ma` | 5.0 | 3.0 | 1.0 | 0.6 | 0.4 |
| `ahr999` | 4.0 | 1.2 | 0.0 | 0.45 | 0.3 |
| `fear_greed_og` | 80.0 | 60.0 | 50.0 | 25.0 | 10.0 |
| `fear_greed_cmc` | 80.0 | 60.0 | 50.0 | 25.0 | 10.0 |

Note: `null` values indicate one-sided indicators where thresholds are not defined for that direction (the indicator contributes a neutral score of 0 for the missing direction).

#### Scenario: Database initialization seeds all 17 configs

- **WHEN** the database is initialized for the first time
- **THEN** the `metric_config` table SHALL contain exactly 17 rows, one for each supported metric, with threshold values matching the table above

#### Scenario: Pre-seeded configs are not overwritten on re-initialization

- **WHEN** the database initialization runs and `metric_config` rows already exist
- **THEN** existing rows SHALL NOT be overwritten (INSERT OR IGNORE behavior), preserving any user-modified thresholds

### Requirement: Save Metric Config

The backend SHALL expose a POST endpoint (`/api/metrics/config`) to save user-defined thresholds into the SQLite database. The endpoint MUST accept configs for any of the 17 supported metrics.

#### Scenario: Saving valid threshold config

- **WHEN** the frontend sends a POST request with payload `{"metric_name": "mvrv_z", "t_minus_2": 6.65, "t_minus_1": 4.6, "t_zero": 0.0, "t_plus_1": 0.17, "t_plus_2": 0.15}`
- **THEN** the backend upserts the record in `metric_config` table and returns a 200 OK response

#### Scenario: Saving config for an unsupported metric

- **WHEN** the frontend sends a POST request with payload `{"metric_name": "invalid_metric", "t_minus_2": 1.0, "t_minus_1": 0.5, "t_zero": 0.0, "t_plus_1": -0.5, "t_plus_2": -1.0}`
- **THEN** the backend returns a 400 response with `{ "error": "Unsupported metric name 'invalid_metric'" }`

### Requirement: Load Metric Config

The backend SHALL expose a GET endpoint (`/api/metrics/config/:metric_name`) to retrieve the saved thresholds for any of the 17 supported metrics.

#### Scenario: Fetching config for a metric

- **WHEN** the frontend sends a GET request to `/api/metrics/config/mvrv_z`
- **THEN** the system returns a 200 response with a JSON object containing `metric_name`, `t_minus_2`, `t_minus_1`, `t_zero`, `t_plus_1`, `t_plus_2` values for `mvrv_z`

#### Scenario: Fetching config for another valid metric

- **WHEN** the frontend sends a GET request to `/api/metrics/config/fear_greed_og`
- **THEN** the system returns a 200 response with the pre-seeded threshold values for `fear_greed_og`

#### Scenario: Fetching config for an unsupported metric

- **WHEN** the frontend sends a GET request to `/api/metrics/config/invalid_metric`
- **THEN** the system returns a 404 response with `{ "error": "Metric config for 'invalid_metric' not found" }`

### Requirement: List All Metric Configs

The backend SHALL expose a GET endpoint (`/api/metrics/configs`) to retrieve all metric configs at once.

The response SHALL be a JSON array of objects, each containing: `metric_name` (string), `t_minus_2` (number or null), `t_minus_1` (number or null), `t_zero` (number or null), `t_plus_1` (number or null), `t_plus_2` (number or null).

#### Scenario: Fetching all configs

- **WHEN** the frontend sends a GET request to `/api/metrics/configs`
- **THEN** the system returns a 200 response with a JSON array of 17 config objects, one per supported metric, each containing `metric_name`, `t_minus_2`, `t_minus_1`, `t_zero`, `t_plus_1`, `t_plus_2`

#### Scenario: Configs reflect user modifications

- **WHEN** the user has previously saved a custom config for `mvrv_z` via POST `/api/metrics/config`
- **AND** the frontend sends a GET request to `/api/metrics/configs`
- **THEN** the returned array SHALL include the user-modified values for `mvrv_z` alongside the pre-seeded defaults for all other metrics
