# metric-playground Delta Specification

## MODIFIED Requirements

### Requirement: Generic Metric Data Endpoint

The backend SHALL expose a GET endpoint (`/api/metrics/:metric_name`) that returns timeseries data for any supported metric. This replaces the previous hardcoded `/api/metrics/aviv_ratio` endpoint with a generic pattern.

The `:metric_name` parameter MUST accept any of the 17 supported metric identifiers:
- `aviv_ratio`, `aviv_nupl`, `cvdd_ratio`, `mvrv_z`, `lth_sth_sopr_ratio`, `terminal_price_ratio`, `unrealized_sell_risk`
- `sharpe_ratio_52w`, `pi_cycle_top`, `vpli`, `risk_metrics`, `dvrsi`, `williams_r`, `two_year_ma`, `ahr999`
- `fear_greed_og`, `fear_greed_cmc`

The response SHALL be a JSON array of objects, each containing: `date` (string, ISO date), `raw_value` (number), `normalized_value` (number), `btc_price` (number).

#### Scenario: Fetching timeseries for a valid metric

- **WHEN** the frontend sends a GET request to `/api/metrics/mvrv_z`
- **THEN** the system returns a 200 response with a JSON array of objects, each containing `date`, `raw_value`, `normalized_value`, and `btc_price` fields, ordered by date ascending

#### Scenario: Fetching timeseries for another valid metric

- **WHEN** the frontend sends a GET request to `/api/metrics/fear_greed_og`
- **THEN** the system returns a 200 response with the same response format: array of `{ date, raw_value, normalized_value, btc_price }`

#### Scenario: Requesting an unsupported metric name

- **WHEN** the frontend sends a GET request to `/api/metrics/invalid_metric`
- **THEN** the system returns a 404 response with `{ "error": "Metric 'invalid_metric' not found" }`

### Requirement: List All Available Metrics

The backend SHALL expose a GET endpoint (`/api/metrics`) that returns a list of all available metrics with their metadata.

The response SHALL be a JSON array of objects, each containing: `metric_name` (string), `category` (string, one of `"fundamental"`, `"technical"`, `"sentiment"`), `display_name` (string, human-readable label).

#### Scenario: Listing all available metrics

- **WHEN** the frontend sends a GET request to `/api/metrics`
- **THEN** the system returns a 200 response with a JSON array of 17 metric objects, each containing `metric_name`, `category`, and `display_name`

### Requirement: Metric Playground View

The system SHALL provide a frontend view that displays three synchronized charts for a selected metric:
1. The first chart SHALL display the BTC OHLC price action.
2. The second chart SHALL display raw historical metric data along with adjustable horizontal threshold lines representing standard bounds (-2, -1, 0, +1, +2).
3. The third chart SHALL display the valuation oscillator mapped from -2 to +2 dynamically.

The metric selector MUST allow the user to choose any of the 17 supported metrics.

#### Scenario: Visualizing raw and mapped data

- **WHEN** the user navigates to the metric playground and selects a metric from the list of 17 supported metrics
- **THEN** the BTC OHLC chart, raw metric chart, and valuation output chart are rendered and synchronized (crosshairs and timeframe logic) for the selected metric

### Requirement: Dynamic Threshold Adjustment

The frontend SHALL allow the user to adjust the threshold values (-2, -1, 0, 1, 2) manually on the raw metric chart.

#### Scenario: Adjusting a threshold

- **WHEN** the user updates the input field for the +2 threshold from 10.0 to 12.0
- **THEN** the valuation output chart dynamically recalculates the mapping in real-time, reflecting the new ceiling.
