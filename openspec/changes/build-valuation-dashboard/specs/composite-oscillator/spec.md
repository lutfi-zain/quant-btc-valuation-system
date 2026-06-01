## ADDED Requirements

### Requirement: Composite Oscillator Calculation Logic

The backend SHALL compute the composite oscillator value for each date as the arithmetic mean of all `normalized_value` entries present in the `timeseries_metrics` table for that date.

The calculation SHALL only include metrics that have a non-null `normalized_value` for the given date. Metrics with no data row or a null `normalized_value` for a particular date SHALL be excluded from that date's composite calculation.

The composite value SHALL remain bounded within the -2 to +2 range because all constituent `normalized_value` entries are individually bounded to that range.

The backend SHALL also track and return the number of contributing metrics (`component_count`) for each date, enabling consumers to assess data coverage confidence.

#### Scenario: Full coverage — all 17 metrics have data for a date

- **WHEN** the composite is calculated for a date where all 17 metrics have non-null `normalized_value` entries
- **THEN** the `composite_value` SHALL be the arithmetic mean of all 17 `normalized_value` values
- **THEN** the `component_count` SHALL be 17

#### Scenario: Partial coverage — some metrics missing for a date

- **WHEN** the composite is calculated for a date where only 5 out of 17 metrics have non-null `normalized_value` entries
- **THEN** the `composite_value` SHALL be the arithmetic mean of those 5 available `normalized_value` values
- **THEN** the `component_count` SHALL be 5
- **THEN** the missing 12 metrics SHALL NOT contribute zero or any default value to the mean

#### Scenario: Single metric available for a date

- **WHEN** the composite is calculated for a date where only 1 metric has a non-null `normalized_value` entry
- **THEN** the `composite_value` SHALL equal that single metric's `normalized_value`
- **THEN** the `component_count` SHALL be 1

#### Scenario: No metrics available for a date

- **WHEN** the composite is calculated for a date where no metrics have non-null `normalized_value` entries
- **THEN** that date SHALL be excluded from the response entirely
- **THEN** no object with a null `composite_value` SHALL appear in the response array

---

### Requirement: Composite Oscillator API Endpoint

The Hono backend SHALL expose a `GET /api/composite` endpoint that returns the composite oscillator timeseries.

The endpoint SHALL accept the following optional query parameters:

| Parameter | Type   | Format       | Description                              |
|-----------|--------|--------------|------------------------------------------|
| `start`   | string | `YYYY-MM-DD` | Inclusive start date filter               |
| `end`     | string | `YYYY-MM-DD` | Inclusive end date filter                 |

The endpoint SHALL query the `timeseries_metrics` SQLite table, grouping by `date` and computing `AVG(normalized_value)` and `COUNT(normalized_value)` across all `metric_name` values for each date.

The endpoint SHALL join or correlate with the `btc_ohlc` table to include the BTC closing price for each date, using the `close` column from `btc_ohlc` as the `btc_price` value.

#### Scenario: Successful composite timeseries retrieval without filters

- **WHEN** a client sends `GET /api/composite`
- **THEN** the API SHALL respond with HTTP status 200
- **THEN** the response JSON payload SHALL be an array of objects
- **THEN** each object SHALL contain exactly the fields: `date`, `composite_value`, `component_count`, `btc_price`
- **THEN** no response field SHALL be prefixed with an underscore
- **THEN** the array SHALL be sorted by `date` in ascending order
- **THEN** `composite_value` SHALL be a number bounded between -2 and +2
- **THEN** `component_count` SHALL be a positive integer
- **THEN** `btc_price` SHALL be a number representing the BTC closing price for that date

#### Scenario: Composite retrieval with start and end date filters

- **WHEN** a client sends `GET /api/composite?start=2020-01-01&end=2023-12-31`
- **THEN** the API SHALL respond with HTTP status 200
- **THEN** the response array SHALL only include objects where `date` is between `2020-01-01` and `2023-12-31` inclusive
- **THEN** dates outside this range SHALL NOT appear in the response

#### Scenario: Composite retrieval with only start filter

- **WHEN** a client sends `GET /api/composite?start=2022-06-01`
- **THEN** the response array SHALL only include objects where `date` is `2022-06-01` or later

#### Scenario: Composite retrieval with only end filter

- **WHEN** a client sends `GET /api/composite?end=2021-12-31`
- **THEN** the response array SHALL only include objects where `date` is `2021-12-31` or earlier

---

### Requirement: Composite Response Format

The `GET /api/composite` endpoint SHALL return a JSON array where each element is an object with the following exact structure:

```json
{
  "date": "2024-01-15",
  "composite_value": 0.73,
  "component_count": 14,
  "btc_price": 42850.00
}
```

| Field              | Type    | Description                                                              |
|--------------------|---------|--------------------------------------------------------------------------|
| `date`             | string  | ISO 8601 date (`YYYY-MM-DD`)                                            |
| `composite_value`  | number  | Arithmetic mean of available normalized values, bounded -2 to +2         |
| `component_count`  | integer | Count of metrics with non-null `normalized_value` contributing to the mean |
| `btc_price`        | number  | BTC closing price from `btc_ohlc.close` for the corresponding date       |

The response SHALL NOT include any fields beyond the four listed above.

#### Scenario: Response field types are correct

- **WHEN** a client receives a successful response from `GET /api/composite`
- **THEN** every `date` value SHALL be a string in `YYYY-MM-DD` format
- **THEN** every `composite_value` SHALL be a JSON number (not a string)
- **THEN** every `component_count` SHALL be a JSON integer greater than 0
- **THEN** every `btc_price` SHALL be a JSON number (not a string)

---

### Requirement: Missing BTC Price Handling

When no corresponding `btc_ohlc` row exists for a given date, the `btc_price` field SHALL be `null` rather than omitting the date from the response. The composite calculation does not depend on BTC price availability.

#### Scenario: Composite date has no BTC OHLC data

- **WHEN** metrics exist for date `2011-01-05` but no row exists in `btc_ohlc` for that date
- **THEN** the response object for `2011-01-05` SHALL include `"btc_price": null`
- **THEN** `composite_value` and `component_count` SHALL still be calculated normally from available `normalized_value` entries

---

### Requirement: Empty Result Handling

When no composite data can be produced for the requested date range (either because no metrics exist at all or the date filter excludes all available data), the endpoint SHALL return an empty array.

#### Scenario: Date range has no data

- **WHEN** a client sends `GET /api/composite?start=1999-01-01&end=1999-12-31`
- **THEN** the API SHALL respond with HTTP status 200
- **THEN** the response JSON payload SHALL be an empty array `[]`

#### Scenario: Database has no timeseries_metrics data at all

- **WHEN** the `timeseries_metrics` table is empty
- **THEN** a request to `GET /api/composite` SHALL respond with HTTP status 200
- **THEN** the response JSON payload SHALL be an empty array `[]`
