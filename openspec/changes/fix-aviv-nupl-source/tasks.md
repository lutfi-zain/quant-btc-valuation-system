## 1. AVIV Ratio Ingestion Code Changes

- [ ] 1.1 Update `quant/components/aviv_ratio.py` to fetch `true_market_mean` instead of `cointime_price` and calculate the ratio as `price / true_market_mean`.
- [ ] 1.2 Update unit tests in `quant/tests/test_components.py` for AVIV Ratio to mock `true_market_mean` instead of `cointime_price` and assert correct calculation.

## 2. AVIV NUPL Ingestion Code Changes

- [ ] 2.1 Update `quant/components/aviv_nupl.py` to fetch `true_market_mean` and `price` instead of caps, and calculate the NUPL as `(price - true_market_mean) / price`.
- [ ] 2.2 Update unit tests in `quant/tests/test_components.py` for AVIV NUPL to mock `true_market_mean` and `price` and assert correct calculation.

## 3. Integration & Database Rebuild

- [ ] 3.1 Rebuild database values by running `.venv/bin/python -m quant.run_all --rebuild` to fetch and store the corrected historical metrics in `database/metrics.db`.
- [ ] 3.2 Update backend test mocks in `backend/index.test.ts` if they refer to outdated endpoints/properties.
- [ ] 3.3 Verify database metrics manually to ensure that `aviv_ratio` and `aviv_nupl` values are accurate and match checkonchain.com (e.g., `aviv_nupl` is close to -0.17 on 2026-06-03).

## 4. Multi-Dimensional Verification

- [ ] 4.1 Perform a complete review of all artifacts (proposal, design, specs, tasks) to ensure all requirement scenarios are met with zero gaps.
- [ ] 4.2 Run Python automated tests via `.venv/bin/python -m pytest -xvs` and TS backend tests via `bun test` to confirm they all pass.
- [ ] 4.3 Start the Hono server locally and run E2E validation of `/api/metrics/aviv_nupl` and `/api/metrics/aviv_ratio` using `curl`.
- [ ] 4.4 Spawn parallel reviewer subagents to audit code correctness, design decisions, and coding standards.
