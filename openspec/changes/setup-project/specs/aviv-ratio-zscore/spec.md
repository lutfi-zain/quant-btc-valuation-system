## ADDED Requirements

### Requirement: AVIV Ratio Data Ingestion
The Python quant module SHALL fetch AVIV Ratio data, normalize it, and store it in the SQLite database.

#### Scenario: Successful data fetch and store
- **WHEN** the AVIV Ratio ingestion script is executed
- **THEN** the system SHALL fetch historical AVIV Ratio data
- **THEN** it SHALL calculate a normalized oscillator score mathematically bounded or scaled to a range between -2 and +2
- **THEN** it SHALL insert or update records in the `timeseries_metrics` table with `metric_name` exactly equal to `aviv_ratio`
- **THEN** each inserted record SHALL contain valid non-null values for `date`, `raw_value`, `normalized_value`, and `btc_price`

### Requirement: API Endpoint for AVIV Ratio
The Hono backend SHALL serve AVIV Ratio timeseries data via a RESTful API endpoint.

#### Scenario: Successful timeseries data retrieval
- **WHEN** a client sends a GET request to `/api/metrics/aviv_ratio`
- **THEN** the API SHALL query the `timeseries_metrics` table for records where `metric_name` is `aviv_ratio`
- **THEN** it SHALL respond with HTTP status 200
- **THEN** the response JSON payload SHALL be an array of objects
- **THEN** each object in the array SHALL contain exactly the fields: `date`, `raw_value`, `normalized_value`, and `btc_price`
- **THEN** no response field SHALL be prefixed with an underscore
