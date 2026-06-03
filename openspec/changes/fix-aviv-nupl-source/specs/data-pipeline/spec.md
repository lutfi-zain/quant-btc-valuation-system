## MODIFIED Requirements

### Requirement: Component — AVIV Ratio-Z
The system SHALL provide a component at `quant/components/aviv_ratio.py` that fetches, computes, and stores the AVIV Ratio Z-Score.

- The component SHALL set `METRIC_NAME` to `"aviv_ratio"` and `CATEGORY` to `"fundamental"`
- `fetch_data()` SHALL fetch the `true_market_mean` and `price` series from bitview.space
- The component SHALL compute the AVIV Ratio as `price / true_market_mean` (True Market Mean), then derive the Z-score from the ratio's historical distribution
- The component SHALL support both full rebuild and incremental delta fetch

#### Scenario: Successful AVIV Ratio fetch and store
- **WHEN** `run_pipeline()` is executed on the AVIV Ratio component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"aviv_ratio"`
- **THEN** each record SHALL have non-null `raw_value`, `normalized_value`, and `btc_price`

### Requirement: Component — AVIV NUPL
The system SHALL provide a component at `quant/components/aviv_nupl.py` that fetches, computes, and stores the AVIV Net Unrealized Profit/Loss.

- The component SHALL set `METRIC_NAME` to `"aviv_nupl"` and `CATEGORY` to `"fundamental"`
- `fetch_data()` SHALL fetch the `true_market_mean` and `price` series from bitview.space
- The component SHALL compute AVIV NUPL as `(price - true_market_mean) / price`
- The component SHALL support both full rebuild and incremental delta fetch

#### Scenario: Successful AVIV NUPL fetch and store
- **WHEN** `run_pipeline()` is executed on the AVIV NUPL component
- **THEN** records SHALL be stored in `timeseries_metrics` with `metric_name` equal to `"aviv_nupl"`
- **THEN** each record SHALL have non-null `raw_value`, `normalized_value`, and `btc_price`
