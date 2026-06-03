## Context

The current `AVIV Ratio-Z` and `AVIV NUPL` indicators stored in the database deviate significantly from the reference checkonchain.com charts:
- `AVIV Ratio` uses `cointime_price` fetched from bitview.space, which is incorrect/inconsistent with True Market Mean.
- `AVIV NUPL` fetches `active_cap` and `investor_cap` from bitview.space and computes the ratio via cap terms. Since `active_cap` and `investor_cap` on bitview.space are calculated differently and contain scaling inconsistencies, they result in incorrect values (e.g., -0.44 instead of -0.17 on 2026-06-03).

By utilizing `true_market_mean` directly, both metrics can be calculated accurately in price terms, aligning precisely with checkonchain.com.

## Goals / Non-Goals

**Goals:**
- Update `quant/components/aviv_ratio.py` to use `true_market_mean` instead of `cointime_price` to fetch the correct True Market Mean series from bitview.space.
- Update `quant/components/aviv_nupl.py` to fetch `price` and `true_market_mean` from bitview.space, and calculate AVIV NUPL in price terms as `(price - true_market_mean) / price`.
- Ensure the SQLite database `database/metrics.db` and test database `test_metrics.db` are updated with the corrected historical values.
- Verify through pytest that components compute correct values and all tests pass.

**Non-Goals:**
- Rewriting or modifying other on-chain or sentiment components.
- Changing the database schema of the `timeseries_metrics` table.

## Decisions

### Decision 1: Direct Price-Term Calculation for AVIV NUPL
- **Rationale**: While `AVIV NUPL` is conceptually `(Active Cap - Investor Cap) / Active Cap` in market cap terms, this requires `Active Cap` and `Investor Cap`. Because Bitview's cap endpoints contain capitalization inconsistencies, calculating via price terms `(Price - True Market Mean) / Price` is mathematically identical but utilizes highly robust and aligned price series (`price` and `true_market_mean`), yielding 100% exact matches with checkonchain.com (down to machine float precision).
- **Alternative considered**: Fetching `active_cap` and `investor_cap` and attempting to clean/scale them manually. This was rejected because it introduces complexity and potential error drift compared to the clean price-based formula.

### Decision 2: Use `true_market_mean` instead of `cointime_price` for AVIV Ratio
- **Rationale**: Analysis of checkonchain's Plotly trace data shows that `true_market_mean` from bitview.space is the correct True Mean Price series that checkonchain uses as the denominator for the AVIV Z-Score.

## Risks / Trade-offs

- **Risk**: Mismatch in historical metrics history length if `true_market_mean` has a different date range or availability.
  - *Mitigation*: Bitview's `true_market_mean` has identical coverage starting from 2009-01-03, aligning perfectly with other cointime metrics.
- **Risk**: Existing unit tests failing due to mock data mismatches.
  - *Mitigation*: Update the test mocks in `quant/tests/test_components.py` and `backend/index.test.ts` to reflect the new API endpoints and return shapes.
