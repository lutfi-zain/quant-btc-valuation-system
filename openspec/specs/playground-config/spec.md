# playground-config Specification

## Purpose
TBD - created by archiving change valuation-playground. Update Purpose after archive.
## Requirements
### Requirement: Save Metric Config
The backend SHALL expose a POST endpoint (`/api/metrics/config`) to save user-defined thresholds into the SQLite database.

#### Scenario: Saving valid threshold config
- **WHEN** the frontend sends a POST request with payload `{"metric_name": "aviv_ratio", "t_minus_2": 0.5, "t_minus_1": 1.0, "t_zero": 1.5, "t_plus_1": 2.0, "t_plus_2": 3.0}`
- **THEN** the backend upserts the record in `metric_config` table and returns a 200 OK response.

### Requirement: Load Metric Config
The backend SHALL expose a GET endpoint (`/api/metrics/config/:metric_name`) to retrieve the saved thresholds.

#### Scenario: Fetching config for a metric
- **WHEN** the frontend sends a GET request to `/api/metrics/config/aviv_ratio`
- **THEN** the system returns a JSON object containing `t_minus_2`, `t_minus_1`, `t_zero`, `t_plus_1`, `t_plus_2` values for `aviv_ratio`. If none exists, it returns null or standard defaults.

