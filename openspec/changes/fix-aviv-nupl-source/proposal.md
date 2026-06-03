## Why

The current AVIV NUPL in our database does not match the official Cointime Economics chart on checkonchain.com (https://charts.checkonchain.com/btconchain/cointime/nupl_aviv/nupl_aviv_light.html). This discrepancy is caused by:
1. `aviv_nupl` fetching `active_cap` and `investor_cap` from bitview.space, which are inconsistent and result in values around -0.44 instead of -0.17 on 2026-06-03.
2. `aviv_ratio` fetching `cointime_price` as the True Market Mean, which is incorrect on bitview.space. The correct True Market Mean series on bitview.space is `true_market_mean`.

To fix this, we need to update both components to use `true_market_mean` and align their mathematical formulas with checkonchain.com.

## What Changes

1. **Modify AVIV Ratio Data Ingestion**:
   - Change data source from `cointime_price` to `true_market_mean`.
   - Update `quant/components/aviv_ratio.py` to fetch `true_market_mean` and `price`, and compute AVIV Ratio as `price / true_market_mean`.

2. **Modify AVIV NUPL Data Ingestion**:
   - Change data source from `active_cap` + `investor_cap` + `price` to `true_market_mean` + `price`.
   - Update `quant/components/aviv_nupl.py` to calculate AVIV NUPL directly as `(price - true_market_mean) / price` which is mathematically equivalent to `(active_cap - investor_cap) / active_cap` but avoids Bitview's inconsistent capitalization data.

3. **Update Database & Re-run Pipelines**:
   - Re-run pipelines for `aviv_ratio` and `aviv_nupl` to populate the correct values in the database.
   - Run tests to verify correctness.

## Capabilities

### New Capabilities

*(None)*

### Modified Capabilities

- `data-pipeline`: Update the data-fetching and calculation requirements for `aviv_ratio` and `aviv_nupl` components to use `true_market_mean` instead of `cointime_price`, `active_cap`, and `investor_cap`.

## Impact

- **Affected Code**: `quant/components/aviv_ratio.py`, `quant/components/aviv_nupl.py`, `quant/tests/test_components.py`, and `backend/index.test.ts`.
- **Database**: The `timeseries_metrics` table values for `aviv_ratio` and `aviv_nupl` will be overwritten with the corrected historical series.
