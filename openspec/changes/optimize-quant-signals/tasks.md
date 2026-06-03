## 1. AVIV Scraping Implementation

- [x] 1.1 Update `quant/components/aviv_ratio.py` to fetch `mvrv_aviv_zscore_light.html` from checkonchain.com and decode the base64-encoded binary float64 array for `"AVIV Z-Score"`. Ensure it supports both `--rebuild` and delta fetch.
- [x] 1.2 Update `quant/components/aviv_nupl.py` to fetch `nupl_aviv_light.html` from checkonchain.com and decode the base64-encoded binary float64 array for `"AVIV NUPL"`. Ensure it supports both `--rebuild` and delta fetch.
- [x] 1.3 Update/write unit tests in `quant/tests/test_components.py` to mock checkonchain HTTP requests and verify correct parsing and storing of AVIV components.
- [x] 1.4 Perform manual validation by running the AVIV components (`python -m quant.components.aviv_ratio` and `python -m quant.components.aviv_nupl`) standalone and checking database values.

## 2. MVRV Z-Score & Sentiment Indicators Update

- [x] 2.1 Update `quant/components/mvrv_z.py` to calculate MVRV Z-Score using a 4-year (1,460-day) rolling standard deviation window of `market_cap` instead of the global standard deviation.
- [x] 2.2 Update `quant/components/fear_greed_og.py` to apply a 30-day Simple Moving Average (SMA) smoothing pass to the daily original Fear & Greed Index.
- [x] 2.3 Update `quant/components/fear_greed_cmc.py` to apply a 30-day Simple Moving Average (SMA) smoothing pass to the daily CoinMarketCap Fear & Greed Index.
- [x] 2.4 Update/write unit tests in `quant/tests/test_components.py` to verify the rolling standard deviation calculation and the 30-day SMA smoothing logic.
- [x] 2.5 Perform manual validation by running `mvrv_z`, `fear_greed_og`, and `fear_greed_cmc` standalone and checking their outputs.

## 3. Normalization Update

- [x] 3.1 Update `quant/components/normalization.py` to return `NaN`/`None` for one-sided metrics when their raw value falls outside their defined active range.
- [x] 3.2 Update the normalization function in `backend/index.ts` to return `null` for one-sided metrics when their raw value falls outside their defined active range.
- [x] 3.3 Add unit tests in `quant/tests/test_components.py` (or a dedicated test file) to assert that one-sided metrics outside active ranges normalize to `NaN`.
- [x] 3.4 Perform manual validation of the normalization engine by inspecting database records of one-sided metrics (e.g. `cvdd_ratio` and `unrealized_sell_risk`).

## 4. Composite Oscillator & Rescaling Calibration

- [x] 4.1 Update `quant/audit/composite.py` to exclude `aviv_nupl` from the `AVG(normalized_value)` SQL query when computing composite parameters.
- [x] 4.2 Update `quant/audit/composite.py` to only fit rescaling parameters using dates that contain at least 10 active components (i.e. `component_count >= 10`).
- [x] 4.3 Update the `/api/composite` endpoint in `backend/index.ts` to exclude `aviv_nupl` from the `AVG(normalized_value)` calculation.
- [x] 4.4 Add unit tests for the updated composite parameters fitting and composite calculation logic.
- [ ] 4.5 Perform manual validation of the rescaled composite values by calling the `/api/composite` endpoint and validating range limits.

## 5. Verification and Auditing

- [x] 5.1 Re-run the full data pipeline rebuild (`python -m quant.run_all --rebuild`) followed by the statistical audit runner (`python -m quant.audit.runner`).
- [ ] 5.2 Verify that all tests pass cleanly by running `python -m pytest -xvs`.
- [ ] 5.3 Perform final auto-verification:
    - 1. Read all change artifacts (`proposal.md`, `design.md`, `specs/`, and `tasks.md`) to verify zero gaps.
    - 2. Map every `SHALL` and `MUST` requirement in the specifications against the implemented code.
    - 3. Start the backend Hono server locally in the background and run a curl test against `/api/composite` and `/api/audit/summary` to verify actual JSON responses.
    - 4. Spawn parallel reviewer subagents to audit the codebase for correctness, conventions, and style consistency, fixing any reported suggestions.
