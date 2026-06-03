# data-pipeline Specification

## Purpose
TBD - created by archiving change build-valuation-dashboard.
## Requirements
### Requirement: BaseComponent Abstract Interface
The system SHALL define an abstract base class `BaseComponent` at `quant/components/base.py` that enforces a standard pipeline interface for all 17 valuation metric components.

- The `BaseComponent` class SHALL declare the following abstract methods that every subclass MUST implement:
  - `fetch_data(full_rebuild: bool = False) -> pd.DataFrame`: Fetches raw metric data from the upstream source. When `full_rebuild` is `True`, it SHALL fetch the entire historical dataset. When `False`, it SHALL fetch only data newer than the latest stored date.
  - `normalize(df: pd.DataFrame) -> pd.DataFrame`: Applies the normalization formula to map raw metric values to the -2 to +2 valuation scale using thresholds from `metric_config`.
  - `store(df: pd.DataFrame) -> int`: Persists the processed DataFrame into the `timeseries_metrics` table and returns the number of rows upserted.
  - `run_pipeline(full_rebuild: bool = False) -> dict`: Orchestrates fetch → normalize → store in sequence and returns a summary dict.
- The `BaseComponent` class SHALL define the following class-level attributes that every subclass MUST set:
  - `METRIC_NAME: str` — the exact identifier stored in the `metric_name` column (e.g., `"aviv_ratio"`, `"mvrv_z"`)
  - `DESCRIPTION: str` — a human-readable description of the metric
  - `CATEGORY: str` — one of `"fundamental"`, `"technical"`, or `"sentiment"`
- The `BaseComponent` constructor SHALL accept an optional `db_path: str` parameter defaulting to the project's standard SQLite database path.
- The `BaseComponent` SHALL provide a concrete helper method `get_latest_date() -> str | None` that queries the `timeseries_metrics` table for the most recent `date` where `metric_name` equals the component's `METRIC_NAME`, returning `None` if no data exists.

#### Scenario: Subclass missing required method
- **WHEN** a developer creates a subclass of `BaseComponent` without implementing `fetch_data`
- **THEN** Python SHALL raise `TypeError` at instantiation time indicating the abstract method is not implemented

#### Scenario: Successful pipeline run
- **WHEN** `run_pipeline(full_rebuild=False)` is called on any component
- **THEN** it SHALL call `fetch_data(full_rebuild=False)`, then `normalize()`, then `store()` in sequence
- **THEN** it SHALL return a dict containing the keys: `metric_name` (str), `rows_fetched` (int), `rows_stored` (int), `status` (str with value `"success"` or `"error"`), and `message` (str)

#### Scenario: Pipeline run with empty fetch result
- **WHEN** `fetch_data()` returns an empty DataFrame (zero rows)
- **THEN** `run_pipeline()` SHALL skip the normalize and store steps
- **THEN** it SHALL return a dict with `status` equal to `"success"`, `rows_fetched` equal to `0`, `rows_stored` equal to `0`, and `message` indicating no new data was available

### Requirement: Bitview Space API Client
The system SHALL provide a reusable API client wrapper at `quant/components/bitview_client.py` for fetching time-series data from the bitview.space platform.

- The client SHALL expose a function `fetch_series(series_name: str, start_date: str | None = None) -> pd.DataFrame` that:
  - Sends an HTTP GET request to `https://bitview.space/api/series/<series_name>`
  - Accepts an optional `start_date` parameter (ISO8601 date string) to fetch only data after that date
  - Returns a pandas DataFrame with at minimum a `date` column (TEXT, ISO8601) and a `value` column (REAL)
- The client SHALL expose a function `search_series(query: str) -> list[dict]` that:
  - Sends an HTTP GET request to `https://bitview.space/api/series/search?q=<query>`
  - Returns a list of dicts with keys `name` and `description` for each matching series
- The client SHALL handle HTTP errors gracefully:
  - On HTTP 4xx errors, it SHALL raise a `BitviewClientError` with the status code and response body
  - On HTTP 5xx errors, it SHALL retry up to 3 times with exponential backoff (1s, 2s, 4s) before raising `BitviewClientError`
  - On network timeout (default 30 seconds), it SHALL raise `BitviewClientError` with a descriptive timeout message
- The client SHALL log all fetch operations at `INFO` level including the series name, date range, and number of rows returned

#### Scenario: Successful series fetch
- **WHEN** `fetch_series("cointime_price")` is called and the API returns HTTP 200 with valid JSON data
- **THEN** the function SHALL return a DataFrame containing columns `date` and `value`
- **THEN** the `date` column SHALL contain ISO8601 date strings
- **THEN** the `value` column SHALL contain numeric (float) values

#### Scenario: Series fetch with start_date for delta
- **WHEN** `fetch_series("cointime_price", start_date="2025-01-01")` is called
- **THEN** the request SHALL include the start_date parameter to fetch only data from that date forward
- **THEN** the returned DataFrame SHALL contain only rows with `date` greater than or equal to `"2025-01-01"`

#### Scenario: API returns server error
- **WHEN** `fetch_series("cointime_price")` is called and the API returns HTTP 500
- **THEN** the client SHALL retry up to 3 times with exponential backoff
- **THEN** if all retries fail, it SHALL raise `BitviewClientError` with a message containing the status code `500`

#### Scenario: API returns not found
- **WHEN** `fetch_series("nonexistent_series")` is called and the API returns HTTP 404
- **THEN** the client SHALL raise `BitviewClientError` immediately (no retry) with a message containing `404` and the series name

#### Scenario: Network timeout
- **WHEN** `fetch_series("cointime_price")` is called and the API does not respond within 30 seconds
- **THEN** the client SHALL raise `BitviewClientError` with a message indicating a timeout occurred

### Requirement: Timeseries Metrics Storage Contract
Every component SHALL store its processed data into the `timeseries_metrics` table using a consistent schema and upsert strategy.

- Each row stored SHALL contain exactly these fields:
  - `date` (TEXT): ISO8601 date string (e.g., `"2025-06-01"`)
  - `metric_name` (TEXT): the component's `METRIC_NAME` value
  - `raw_value` (REAL): the raw computed metric value before normalization
  - `normalized_value` (REAL): the value mapped to the -2 to +2 scale
  - `btc_price` (REAL): the BTC closing price on that date
- The `store()` method SHALL use SQLite `INSERT OR REPLACE` (upsert) semantics keyed on the composite primary key `(metric_name, date)` so that re-running a pipeline overwrites stale data without creating duplicates.
- The `store()` method SHALL NOT insert rows where `raw_value` is NULL or NaN. Such rows SHALL be silently skipped.
- The `store()` method SHALL return the count of rows successfully upserted.

#### Scenario: Upsert overwrites existing data
- **WHEN** `store()` is called with a DataFrame containing a row for date `"2025-06-01"` and `metric_name` `"mvrv_z"`, and a row for that date and metric already exists
- **THEN** the existing row SHALL be replaced with the new values
- **THEN** no duplicate rows SHALL exist for the same `(metric_name, date)` pair

#### Scenario: NaN values are skipped
- **WHEN** `store()` is called with a DataFrame containing 100 rows, 5 of which have `raw_value` as NaN
- **THEN** exactly 95 rows SHALL be upserted
- **THEN** the method SHALL return `95`

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

### Requirement: Component — CVDD Ratio
The system SHALL provide a component at `quant/components/cvdd_ratio.py` that fetches, computes, and stores the Cumulative Value Days Destroyed Ratio.

- The component SHALL set `METRIC_NAME` to `"cvdd_ratio"` and `CATEGORY` to `"fundamental"`
- `fetch_data()` SHALL fetch the `coindays_destroyed` and `price` series from bitview.space
- The component SHALL compute the CVDD as the cumulative sum of `(CDD × price)` divided by the age of the market in days divided by 6,000,000, then derive the ratio of price to CVDD

#### Scenario: Successful CVDD Ratio fetch and store
- **WHEN** `run_pipeline()` is executed on the CVDD Ratio component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"cvdd_ratio"`

### Requirement: Component — MVRV Z-Score
The system SHALL provide a component at `quant/components/mvrv_z.py` that fetches, computes, and stores the Market Value to Realized Value Z-Score.

- The component SHALL set `METRIC_NAME` to `"mvrv_z"` and `CATEGORY` to `"fundamental"`
- `fetch_data()` SHALL fetch the `market_cap` and `realized_cap` series from bitview.space
- The component SHALL compute MVRV Z-Score as `(market_cap - realized_cap) / rolling_stddev(market_cap)` using a 4-year (1,460 days) rolling standard deviation window of `market_cap`.

#### Scenario: Successful MVRV-Z fetch and store
- **WHEN** `run_pipeline()` is executed on the MVRV-Z component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"mvrv_z"`

### Requirement: Component — LTH/STH SOPR Ratio
The system SHALL provide a component at `quant/components/lth_sth_sopr_ratio.py` that fetches, computes, and stores the Long-Term Holder to Short-Term Holder SOPR Ratio.

- The component SHALL set `METRIC_NAME` to `"lth_sth_sopr_ratio"` and `CATEGORY` to `"fundamental"`
- `fetch_data()` SHALL fetch the `lth_sopr` and `sth_sopr` series from bitview.space
- The component SHALL compute the ratio as `lth_sopr / sth_sopr`

#### Scenario: Successful LTH/STH SOPR Ratio fetch and store
- **WHEN** `run_pipeline()` is executed on the LTH/STH SOPR Ratio component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"lth_sth_sopr_ratio"`

### Requirement: Component — Terminal Price Ratio
The system SHALL provide a component at `quant/components/terminal_price_ratio.py` that fetches, computes, and stores the Terminal Price Ratio.

- The component SHALL set `METRIC_NAME` to `"terminal_price_ratio"` and `CATEGORY` to `"fundamental"`
- `fetch_data()` SHALL fetch the `terminal_price` (or `transferred_price`) and `price` series from bitview.space
- The component SHALL compute the ratio as `price / terminal_price`

#### Scenario: Successful Terminal Price Ratio fetch and store
- **WHEN** `run_pipeline()` is executed on the Terminal Price Ratio component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"terminal_price_ratio"`

### Requirement: Component — Unrealized Sell-Side Risk Ratio
The system SHALL provide a component at `quant/components/unrealized_sell_risk.py` that fetches, computes, and stores the Unrealized Sell-Side Risk Ratio.

- The component SHALL set `METRIC_NAME` to `"unrealized_sell_risk"` and `CATEGORY` to `"fundamental"`
- `fetch_data()` SHALL fetch the `unrealized_profit`, `unrealized_loss`, and `realized_cap` series from bitview.space
- The component SHALL compute the ratio as `(unrealized_profit + unrealized_loss) / realized_cap`

#### Scenario: Successful Unrealized Sell-Side Risk fetch and store
- **WHEN** `run_pipeline()` is executed on the Unrealized Sell-Side Risk component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"unrealized_sell_risk"`

### Requirement: Component — Rolling 52-Week Sharpe Ratio
The system SHALL provide a component at `quant/components/sharpe_ratio_52w.py` that computes and stores the Rolling 52-Week Sharpe Ratio from BTC price data.

- The component SHALL set `METRIC_NAME` to `"sharpe_ratio_52w"` and `CATEGORY` to `"technical"`
- `fetch_data()` SHALL fetch the `price` series from bitview.space
- The component SHALL compute log returns, then apply a 365-day rolling window to calculate `(mean(log_returns) / stddev(log_returns)) * sqrt(365)`

#### Scenario: Successful Sharpe Ratio fetch and store
- **WHEN** `run_pipeline()` is executed on the Sharpe Ratio component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"sharpe_ratio_52w"`
- **THEN** the first 364 rows SHALL have NaN `raw_value` (insufficient window) and SHALL NOT be stored

### Requirement: Component — Pi Cycle Top
The system SHALL provide a component at `quant/components/pi_cycle_top.py` that computes and stores the Pi Cycle Top indicator from BTC price data.

- The component SHALL set `METRIC_NAME` to `"pi_cycle_top"` and `CATEGORY` to `"technical"`
- `fetch_data()` SHALL fetch the `price` series from bitview.space
- The component SHALL compute `SMA(111) / (SMA(350) * 2)` from daily closing prices
- A value approaching or exceeding `1.0` indicates a potential cycle top

#### Scenario: Successful Pi Cycle Top fetch and store
- **WHEN** `run_pipeline()` is executed on the Pi Cycle Top component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"pi_cycle_top"`

### Requirement: Component — VPLI (Valuation Power Law Index)
The system SHALL provide a component at `quant/components/vpli.py` that computes and stores the Valuation Power Law Index from BTC price data.

- The component SHALL set `METRIC_NAME` to `"vpli"` and `CATEGORY` to `"technical"`
- `fetch_data()` SHALL fetch the `price` series from bitview.space
- The component SHALL fit a power-law regression to BTC price over time, compute the residual (deviation from power-law fair value), and divide by annualized volatility to produce a scaled index

#### Scenario: Successful VPLI fetch and store
- **WHEN** `run_pipeline()` is executed on the VPLI component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"vpli"`

### Requirement: Component — Risk Metrics
The system SHALL provide a component at `quant/components/risk_metrics.py` that computes and stores the Risk Metric indicator from BTC price data.

- The component SHALL set `METRIC_NAME` to `"risk_metrics"` and `CATEGORY` to `"technical"`
- `fetch_data()` SHALL fetch the `price` series from bitview.space
- The component SHALL compute a risk score based on the logarithmic deviation of price from SMA(374), scaled by a time-decay factor, and normalized to a 0-1 range

#### Scenario: Successful Risk Metrics fetch and store
- **WHEN** `run_pipeline()` is executed on the Risk Metrics component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"risk_metrics"`

### Requirement: Component — DVRSI (Dollar Volume RSI)
The system SHALL provide a component at `quant/components/dvrsi.py` that computes and stores the Dollar Volume RSI indicator.

- The component SHALL set `METRIC_NAME` to `"dvrsi"` and `CATEGORY` to `"technical"`
- `fetch_data()` SHALL fetch the `price` and `volume` series from bitview.space on a weekly timeframe
- The component SHALL compute a volume-weighted RSI(14) on weekly data with a noise-reduction smoothing pass

#### Scenario: Successful DVRSI fetch and store
- **WHEN** `run_pipeline()` is executed on the DVRSI component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"dvrsi"`

### Requirement: Component — Williams %R
The system SHALL provide a component at `quant/components/williams_r.py` that computes and stores the Williams %R oscillator.

- The component SHALL set `METRIC_NAME` to `"williams_r"` and `CATEGORY` to `"technical"`
- `fetch_data()` SHALL fetch the `price` series from bitview.space on a weekly timeframe
- The component SHALL compute Williams %R with a 71-week lookback: `((highest_high - close) / (highest_high - lowest_low)) * -100`

#### Scenario: Successful Williams %R fetch and store
- **WHEN** `run_pipeline()` is executed on the Williams %R component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"williams_r"`

### Requirement: Component — 2 Year Moving Average Multiplier
The system SHALL provide a component at `quant/components/two_year_ma.py` that computes and stores the 2 Year Moving Average Multiplier.

- The component SHALL set `METRIC_NAME` to `"two_year_ma"` and `CATEGORY` to `"technical"`
- `fetch_data()` SHALL fetch the `price` series from bitview.space
- The component SHALL compute `price / SMA(730)` as the multiplier ratio

#### Scenario: Successful 2 Year MA fetch and store
- **WHEN** `run_pipeline()` is executed on the 2 Year MA component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"two_year_ma"`

### Requirement: Component — Ahr999 Index
The system SHALL provide a component at `quant/components/ahr999.py` that computes and stores the Bitcoin Ahr999 Index.

- The component SHALL set `METRIC_NAME` to `"ahr999"` and `CATEGORY` to `"technical"`
- `fetch_data()` SHALL fetch the `price` series from bitview.space
- The component SHALL compute the Ahr999 Index as the geometric mean of two ratios: `(price / DCA_200day_cost)` and `(price / growth_valuation)`, where `DCA_200day_cost` is the 200-day simple moving average and `growth_valuation` is derived from a log-linear regression of price over time

#### Scenario: Successful Ahr999 fetch and store
- **WHEN** `run_pipeline()` is executed on the Ahr999 component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"ahr999"`

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

### Requirement: Component Isolation — One Component One Script
Each of the 17 components MUST be implemented as a standalone Python script in the `quant/components/` directory. Each script SHALL be independently executable via `python -m quant.components.<module_name>`.

- When executed directly (via `__main__` block), the script SHALL:
  - Instantiate its component class
  - Call `run_pipeline(full_rebuild=False)` by default
  - Accept a `--rebuild` CLI flag to trigger `run_pipeline(full_rebuild=True)`
  - Print the pipeline result summary to stdout as formatted JSON
- Each component script SHALL NOT import or depend on any other component script. Shared utilities (bitview client, normalization, base class) are the only permitted cross-imports.

#### Scenario: Running a component standalone
- **WHEN** a user executes `python -m quant.components.mvrv_z`
- **THEN** it SHALL perform an incremental delta fetch, normalize, and store for the MVRV-Z metric
- **THEN** it SHALL print a JSON summary to stdout containing `metric_name`, `rows_fetched`, `rows_stored`, and `status`

#### Scenario: Running a component with full rebuild
- **WHEN** a user executes `python -m quant.components.mvrv_z --rebuild`
- **THEN** it SHALL perform a full rebuild fetch from the earliest available data
- **THEN** existing data for `metric_name` equal to `"mvrv_z"` SHALL be replaced via upsert

### Requirement: Full Rebuild vs Delta Fetch
Every component SHALL support two fetch modes: full rebuild and incremental delta.

- **Full Rebuild** (`full_rebuild=True`):
  - SHALL fetch the entire historical dataset from the data source with no date filter
  - SHALL upsert all rows into `timeseries_metrics`, overwriting any existing data
  - SHALL be used for initial data population or to correct data integrity issues
- **Incremental Delta** (`full_rebuild=False`, the default):
  - SHALL query `timeseries_metrics` for the latest `date` where `metric_name` equals the component's `METRIC_NAME`
  - If a latest date exists, SHALL fetch only data newer than that date from the upstream source
  - If no data exists (first run), SHALL behave identically to a full rebuild
  - SHALL upsert fetched rows without modifying existing historical data

#### Scenario: First-ever delta fetch behaves as full rebuild
- **WHEN** `run_pipeline(full_rebuild=False)` is called and no rows exist in `timeseries_metrics` for that `metric_name`
- **THEN** the component SHALL fetch the entire historical dataset (same behavior as full rebuild)
- **THEN** all fetched rows SHALL be stored

#### Scenario: Delta fetch after existing data
- **WHEN** `run_pipeline(full_rebuild=False)` is called and the latest stored date is `"2025-05-30"`
- **THEN** `fetch_data()` SHALL request only data from `"2025-05-31"` onward
- **THEN** only newly fetched rows SHALL be upserted, leaving existing rows unchanged

#### Scenario: Full rebuild overwrites stale data
- **WHEN** `run_pipeline(full_rebuild=True)` is called and 1000 rows already exist for that metric
- **THEN** the component SHALL fetch the complete historical dataset
- **THEN** all rows SHALL be upserted, overwriting any existing rows with matching `(metric_name, date)` keys

### Requirement: Run All Pipeline Orchestrator
The system SHALL provide a CLI entry point at `quant/run_all.py` that executes all 17 component pipelines sequentially.

- The script SHALL be executable via `python -m quant.run_all`
- It SHALL accept a `--rebuild` CLI flag to trigger full rebuild mode for all components
- It SHALL import and instantiate all 17 component classes from `quant/components/`
- It SHALL execute each component's `run_pipeline()` method sequentially, catching and logging any exceptions per component without halting the entire run
- After all components have run, it SHALL print a summary table to stdout showing: component name, rows fetched, rows stored, status, and error message (if any)
- The exit code SHALL be `0` if all components succeeded, or `1` if any component reported an error

#### Scenario: All components succeed
- **WHEN** `python -m quant.run_all` is executed and all 17 components fetch and store successfully
- **THEN** the summary table SHALL show `status` equal to `"success"` for all 17 rows
- **THEN** the process SHALL exit with code `0`

#### Scenario: One component fails, others continue
- **WHEN** `python -m quant.run_all` is executed and the `fear_greed_cmc` component raises an exception during fetch
- **THEN** the orchestrator SHALL log the error for `fear_greed_cmc` and continue executing the remaining components
- **THEN** the summary table SHALL show `status` equal to `"error"` for `fear_greed_cmc` and `"success"` for all other components
- **THEN** the process SHALL exit with code `1`

#### Scenario: Full rebuild via CLI flag
- **WHEN** `python -m quant.run_all --rebuild` is executed
- **THEN** every component's `run_pipeline()` SHALL be called with `full_rebuild=True`

### Requirement: External API Error Handling
All components that fetch data from external APIs (bitview.space, alternative.me, CoinMarketCap) SHALL implement graceful error handling that preserves existing data integrity.

- On any fetch error, the component SHALL NOT delete, truncate, or modify existing data in `timeseries_metrics`
- On transient errors (HTTP 5xx, timeouts, connection errors), the component SHALL retry up to 3 times with exponential backoff before failing
- On permanent errors (HTTP 4xx excluding 429), the component SHALL fail immediately without retry
- On HTTP 429 (rate limited), the component SHALL respect the `Retry-After` header or wait a default of 60 seconds before retrying
- All errors SHALL be logged at `ERROR` level with the component name, error type, and descriptive message
- The `run_pipeline()` return dict SHALL contain the error details in the `message` field when `status` is `"error"`

#### Scenario: Transient API failure with successful retry
- **WHEN** a component's `fetch_data()` encounters an HTTP 500 on the first attempt but HTTP 200 on the second attempt
- **THEN** the pipeline SHALL complete successfully
- **THEN** the returned status SHALL be `"success"`

#### Scenario: All retries exhausted
- **WHEN** a component's `fetch_data()` encounters HTTP 500 on all 3 retry attempts
- **THEN** `run_pipeline()` SHALL return `status` equal to `"error"` and `message` describing the failure
- **THEN** no data in `timeseries_metrics` for that metric SHALL be modified

#### Scenario: Empty response from API
- **WHEN** a component's `fetch_data()` receives an HTTP 200 response with an empty data array
- **THEN** `fetch_data()` SHALL return an empty DataFrame
- **THEN** `run_pipeline()` SHALL return `status` equal to `"success"` with `rows_fetched` equal to `0` and `rows_stored` equal to `0`

