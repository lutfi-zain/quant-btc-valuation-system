## Why

The current BTC Cycle Valuation System has several statistical and structural issues that distort the Composite Oscillator and introduce bias into the historical dataset:
1. **AVIV Calculation Inaccuracies**: Fetching `true_market_mean` and price from Bitview and calculating Z-score/NUPL locally introduces feed discrepancies compared to the official checkonchain.com reference charts.
2. **MVRV Z-Score Saturation**: Calculating MVRV Z-Score using a global historical standard deviation squashes early years (2009-2016) close to zero. This locks the normalized indicator at `+2.0` (dasar siklus) for 58% of the history, skewing the Composite Oscillator's historical median.
3. **Collinearity and Double Counting**: Having both `aviv_ratio` and `aviv_nupl` in the equal-weighted Composite Oscillator represents a double count of the underlying Cointime economics data due to their perfect rank correlation ($\rho = 1.0$).
4. **One-Sided Metric Dampening**: One-sided indicators (like bottom-only `cvdd_ratio`) return `0.0` or neutral values at market peaks, pulling the overall Composite Oscillator towards neutral and dampening the cycle peak signal.
5. **Sentiment Indicator Noise**: High-frequency swings in daily/weekly sentiment indicators (`fear_greed_og` and `fear_greed_cmc`) inject short-term noise into the macro cycle oscillator.

This proposal aims to resolve these statistical anomalies to produce a clean, robust, and highly reliable Composite Oscillator.

## What Changes

- **Direct Plotly Scraping for AVIV Components**: Modify `aviv_ratio` and `aviv_nupl` components to scrape and decode binary Plotly float arrays (`bdata`) directly from checkonchain.com chart HTML files, ensuring 100% exact alignment with official reference charts.
- **Rolling Volatility Standardisation for MVRV Z-Score**: Update `mvrv_z` component to calculate Z-score using a 4-year rolling standard deviation window (1,460 days), aligning Z-score calculations with local volatility regimes and eliminating the early-years saturation anomaly.
- **Sentiment Indicator Smoothing**: Implement a 30-day Simple Moving Average (SMA) smoothing pass on `fear_greed_og` and `fear_greed_cmc` components to filter out short-term noise.
- **Asymmetric One-Sided Metric Exclusion**: Update the normalizer and composite calculation to return `NULL` (rather than `0.0` or neutral) for bottom-only or top-only indicators when market conditions are on the opposite side of their signal ranges, excluding them from the composite average.
- **Weighted Composite Aggregation (De-duplication)**: Exclude `aviv_nupl` from the Composite average calculation (since it is mathematically redundant with `aviv_ratio`) or implement a weighted composite scheme to prevent double-counting.
- **Rescaling Param Calibration Filtering**: Update the statistical audit runner to only fit composite rescaling parameters on dates with a minimum component count (e.g., `component_count >= 10`) to prevent the low-component early years from skewing global percentiles.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `data-pipeline`: Update AVIV fetching to scrape Plotly HTML directly, implement rolling standard deviation for MVRV Z-Score, and apply 30-day SMA smoothing to Fear & Greed sentiment indicators.
- `metric-normalization`: Update one-sided indicators to return `NULL` when raw values fall outside their defined active range.
- `statistical-audit`: Update the composite fitting and audit parameters to only calculate rescaling percentiles on dates with `component_count >= 10` and exclude `aviv_nupl` from composite aggregation.

## Impact

- **Affected Code**: `quant/components/aviv_ratio.py`, `quant/components/aviv_nupl.py`, `quant/components/mvrv_z.py`, `quant/components/fear_greed_og.py`, `quant/components/fear_greed_cmc.py`, `quant/components/normalization.py`, `quant/audit/composite.py`, and `backend/index.ts`.
- **Database**: Rebuilding metrics database via `run_all --rebuild` will populate the timeseries table with corrected historical series, resulting in a newly calibrated and highly robust Composite Oscillator.
