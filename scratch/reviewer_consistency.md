# Quantitative System Consistency and Code Correctness Audit Report

## 1. Executive Summary
This audit inspects the codebase for:
1. Correspondence between the TypeScript implementation of `normalizeValue()` in `backend/index.ts` and the Python implementation in `quant/components/normalization.py`.
2. Conformance of API endpoint registrations and logic to specifications.
3. Adherence to naming conventions (`snake_case` vs `camelCase`).
4. Identification of any private/underscore-prefixed fields in serialized JSON or database outputs.

---

## 2. Normalization Logic Equivalence
The TypeScript implementation of `normalizeValue()` in `backend/index.ts` matches the Python implementation in `quant/components/normalization.py` exactly:

* **Safety Checks:** Both define a `safe_div` function that handles division-by-zero protection when the absolute value of the denominator is $< 10^{-9}$ (returning `0.0` in both languages).
* **Auto-Detection of Direction:** The order of threshold comparison (determining whether a metric is inverted/normal/one-sided bottom-only/one-sided top-only) is identical.
* **Interpolation Paths:** All piecewise linear interpolation paths—clamped limits ($\pm 2$), normal direction, inverted direction, and one-sided (bottom-only/top-only) boundaries—are identical.
* **Testing parity:** Both testing files (`quant/tests/test_normalization.py` and `backend/index.test.ts`) assert exact parity with identical values (e.g., AVIV ratio boundaries, MVRV Z-Score, Terminal Price Ratio, CVDD bottom-only, and Unrealized Sell Risk top-only).

---

## 3. Endpoint Registrations & Conformance
All Hono API endpoints are registered cleanly:
* `GET /api/health`
* `GET /api/metrics`
* `GET /api/metrics/configs`
* `GET /api/composite`
* `GET /api/audit/summary`
* `GET /api/metrics/:metric_name`
* `GET /api/metrics/btc_ohlc`
* `POST /api/metrics/config`
* `GET /api/metrics/config/defaults`
* `GET /api/metrics/config/:metric_name`
* `POST /api/metrics/renormalize/:metric_name`
* `POST /api/pipeline/run`

The logic correctly extracts database state, calculates composite rescaling parameters based on statistical percentiles (p2.5, p50, p97.5) stored during audit runs, and handles errors with appropriate HTTP status codes (400, 404, 500).

---

## 4. Naming Conventions & Style Consistency
* **Database Schema:** SQLite tables (`timeseries_metrics`, `metric_config`, `btc_ohlc`, `audit_indicator_stats`, `audit_correlation_matrix`, and `audit_composite_params`) consistently use `snake_case` for all column names.
* **API Payloads:** API payloads return keys derived from database column names in `snake_case` (e.g., `raw_value`, `normalized_value`, `composite_value`, `btc_price`, `metric_name`, `pct_at_plus2`, etc.).
* **TypeScript Code:** Uses standard `camelCase` for variable names (`dbPath`, `compParams`, `mappedResults`), but retains `snake_case` for local parameters (`t_plus_2`, `t_plus_1`, `t_minus_1`, `t_minus_2`) and variables (`is_bottom_only`, `is_top_only`) in `normalizeValue()` to ensure parity with the Python implementation. This is a justifiable exception.
* **Minor Inconsistency Discovered:**
  In `POST /api/pipeline/run` (lines 658 and 679 of `backend/index.ts`), the failure response returns `exitCode` (camelCase) instead of `exit_code` (snake_case):
  ```typescript
  return c.json({
    success: false,
    step: "run_all",
    exitCode: runAllExitCode, // <-- camelCase
    error: runAllError || runAllOutput
  }, 500);
  ```
  For strict consistency with the other snake_case properties returned throughout the API, this field should ideally be serialized as `exit_code`.

---

## 5. Private & Underscore-Prefixed Fields Verification
* **JSON/API Serialization:** No underscore-prefixed or private fields are returned in any JSON response. All endpoints return explicit, clean object structures mapping directly to SQLite rows or API specs.
* **Python Code:** The project does not currently use Pydantic models for web serialization (since the API layer is written in TS/Hono). There are no private fields in the data structures passed between Python components and SQLite.
* **Internal Helper Methods:** Python classes correctly utilize PEP 8 conventions for protected/private helper methods (e.g. `_default_store`, `_default_run_pipeline`), which are only used internally and are never serialized or returned as public API outputs.
