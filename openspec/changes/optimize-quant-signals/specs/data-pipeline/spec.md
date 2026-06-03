## MODIFIED Requirements

### Requirement: Component — AVIV Ratio-Z
The system SHALL provide a component at `quant/components/aviv_ratio.py` that fetches and stores the AVIV Ratio Z-Score.

- The component SHALL set `METRIC_NAME` to `"aviv_ratio"` and `CATEGORY` to `"fundamental"`
- `fetch_data()` SHALL scrape checkonchain.com directly by fetching the HTML chart file at `https://charts.checkonchain.com/btconchain/unrealised/mvrv_aviv_zscore/mvrv_aviv_zscore_light.html` and decoding the Plotly binary float array (`bdata`) for the `"AVIV Z-Score"` trace.
- The component SHALL decode the base64-encoded `bdata` as a binary float64 (little-endian `"f8"`) array to retrieve exact historical AVIV Z-Score values.
- The component SHALL support both full rebuild and incremental delta fetch.

#### Scenario: Successful AVIV Ratio fetch and store
- **WHEN** `run_pipeline()` is executed on the AVIV Ratio component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"aviv_ratio"`
- **THEN** each record SHALL have non-null `raw_value`, `normalized_value`, and `btc_price`

### Requirement: Component — AVIV NUPL
The system SHALL provide a component at `quant/components/aviv_nupl.py` that fetches and stores the AVIV Net Unrealized Profit/Loss.

- The component SHALL set `METRIC_NAME` to `"aviv_nupl"` and `CATEGORY` to `"fundamental"`
- `fetch_data()` SHALL scrape checkonchain.com directly by fetching the HTML chart file at `https://charts.checkonchain.com/btconchain/cointime/nupl_aviv/nupl_aviv_light.html` and decoding the Plotly binary float array (`bdata`) for the `"AVIV NUPL"` trace.
- The component SHALL decode the base64-encoded `bdata` as a binary float64 (little-endian `"f8"`) array to retrieve exact historical AVIV NUPL values.
- The component SHALL support both full rebuild and incremental delta fetch.

#### Scenario: Successful AVIV NUPL fetch and store
- **WHEN** `run_pipeline()` is executed on the AVIV NUPL component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"aviv_nupl"`
- **THEN** each record SHALL have non-null `raw_value`, `normalized_value`, and `btc_price`

### Requirement: Component — MVRV Z-Score
The system SHALL provide a component at `quant/components/mvrv_z.py` that fetches, computes, and stores the Market Value to Realized Value Z-Score.

- The component SHALL set `METRIC_NAME` to `"mvrv_z"` and `CATEGORY` to `"fundamental"`
- `fetch_data()` SHALL fetch the `market_cap` and `realized_cap` series from bitview.space
- The component SHALL compute MVRV Z-Score as `(market_cap - realized_cap) / rolling_stddev(market_cap)` using a 4-year (1,460 days) rolling standard deviation window of `market_cap`.

#### Scenario: Successful MVRV-Z fetch and store
- **WHEN** `run_pipeline()` is executed on the MVRV-Z component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"mvrv_z"`

### Requirement: Component — OG Fear & Greed Index
The system SHALL provide a component at `quant/components/fear_greed_og.py` that fetches and stores the original Fear & Greed Index from alternative.me.

- The component SHALL set `METRIC_NAME` to `"fear_greed_og"` and `CATEGORY` to `"sentiment"`
- `fetch_data()` SHALL send an HTTP GET request to `https://api.alternative.me/fng/?limit=0&format=json` for full rebuild, or `?limit=<days_since_latest>` for delta fetch
- The response JSON SHALL contain a `data` array of objects with `value` (string, 0-100), `timestamp` (unix timestamp), and `value_classification` (string)
- The component SHALL convert the `value` to a float and the `timestamp` to an ISO8601 date string
- The component SHALL apply a 30-day Simple Moving Average (SMA) smoothing pass to the daily index values to filter out high-frequency noise.
- The component SHALL handle rate limiting by respecting a minimum 1-second delay between consecutive API calls

#### Scenario: Successful OG Fear & Greed fetch
- **WHEN** `run_pipeline()` is executed on the OG Fear & Greed component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"fear_greed_og"`
- **THEN** `raw_value` SHALL be a float between 0 and 100 inclusive representing the 30-day SMA smoothed index

#### Scenario: alternative.me API is unavailable
- **WHEN** `fetch_data()` is called and the alternative.me API returns HTTP 503
- **THEN** the client SHALL retry up to 3 times with exponential backoff
- **THEN** if all retries fail, `run_pipeline()` SHALL return a dict with `status` equal to `"error"` and a descriptive `message`
- **THEN** no existing data in `timeseries_metrics` SHALL be deleted or modified

### Requirement: Component — CMC Fear & Greed Index
The system SHALL provide a component at `quant/components/fear_greed_cmc.py` that fetches and stores the CoinMarketCap Fear & Greed Index.

- The component SHALL set `METRIC_NAME` to `"fear_greed_cmc"` and `CATEGORY` to `"sentiment"`
- `fetch_data()` SHALL retrieve the CoinMarketCap Fear & Greed data from the publicly accessible charts data endpoint
- The component SHALL apply a 30-day Simple Moving Average (SMA) smoothing pass to the daily index values to filter out high-frequency noise.
- The component SHALL handle rate limiting by respecting a minimum 2-second delay between consecutive API calls
- The component SHALL set a proper `User-Agent` header to avoid being blocked

#### Scenario: Successful CMC Fear & Greed fetch
- **WHEN** `run_pipeline()` is executed on the CMC Fear & Greed component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"fear_greed_cmc"`
- **THEN** `raw_value` SHALL be a float between 0 and 100 inclusive representing the 30-day SMA smoothed index

#### Scenario: CoinMarketCap endpoint is blocked or rate-limited
- **WHEN** `fetch_data()` is called and the endpoint returns HTTP 429 (Too Many Requests)
- **THEN** the client SHALL wait for the duration specified in the `Retry-After` header (or 60 seconds if not present) before retrying
- **THEN** it SHALL retry up to 2 additional times
- **THEN** if all retries fail, `run_pipeline()` SHALL return a dict with `status` equal to `"error"` and a descriptive `message`
