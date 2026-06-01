## ADDED Requirements

### Requirement: AVIV Ratio Z-Score Calculation
The quant module SHALL fetch necessary data to calculate the AVIV Ratio Z-Score, storing the result in the `aviv_ratio_zscore` SQLite table. The table schema MUST contain `date` (TEXT, YYYY-MM-DD) and `value` (REAL).

#### Scenario: Fetch and calculate successfully
- **WHEN** `fetch_and_calculate(rebuild=False)` is executed
- **THEN** the `aviv_ratio_zscore` table is populated or updated with new data points.

### Requirement: AVIV Ratio Z-Score API Endpoint
The Hono backend SHALL expose an endpoint to retrieve the time-series data for the AVIV Ratio Z-Score.

#### Scenario: Valid request to API
- **WHEN** a client sends a GET request to `/api/metrics/aviv-ratio-zscore`
- **THEN** the API returns a 200 OK status with a JSON array of objects formatted as `{"date": "YYYY-MM-DD", "value": 1.23}`.

#### Scenario: Empty database
- **WHEN** a client sends a GET request to `/api/metrics/aviv-ratio-zscore` and the table is empty
- **THEN** the API returns a 200 OK status with an empty JSON array `[]`.

### Requirement: AVIV Ratio Z-Score Visualization
The frontend SHALL render a Recharts line chart displaying the AVIV Ratio Z-Score data, including reference lines for standard deviation thresholds (-2, -1, 1, 2).

#### Scenario: Loading the dashboard
- **WHEN** the user navigates to the AVIV Ratio Z-Score dashboard
- **THEN** a Recharts component is displayed with the time-series data fetched from the API and horizontal reference lines at -2, -1, 1, and 2.
