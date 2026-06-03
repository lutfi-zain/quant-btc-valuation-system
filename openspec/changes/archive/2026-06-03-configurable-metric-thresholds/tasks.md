## 1. Backend Seed Strategy Change (INSERT OR IGNORE)

- [x] 1.1 Change `backend/index.ts` seed logic (L140-149) from `INSERT OR REPLACE` to `INSERT OR IGNORE` so user-modified thresholds are preserved across server restarts. Verify by: starting the server, modifying a threshold via `POST /api/metrics/config`, restarting the server, and confirming the modified value persists via `GET /api/metrics/config/:metric_name`.
- [x] 1.2 Change `quant/seed_metric_config.py` (L77-80) from `INSERT OR REPLACE` to `INSERT OR IGNORE`. Run `python -m quant.seed_metric_config` twice and verify existing rows are not overwritten. Add a pytest test in `quant/tests/` that verifies seed idempotency: seed → modify a row → seed again → assert the modification is preserved.
- [x] 1.3 Update the existing backend test `backend/index.test.ts` to verify the seed does not overwrite a pre-existing metric_config row.

## 2. Backend TypeScript Normalization Function

- [x] 2.1 Implement `normalizeValue()` TypeScript function in `backend/index.ts` that matches the behavior of Python's `normalize()` from `quant/components/normalization.py`. Must support: normal direction, inverted direction, bottom-only, top-only, null raw_value, and all-null thresholds. Port the exact same piecewise linear interpolation logic.
- [x] 2.2 Add unit tests in `backend/index.test.ts` for `normalizeValue()` covering all spec scenarios: normal metric at each region (+2, +1.5, 0, -1.5, -2), inverted metric (terminal_price_ratio), bottom-only (cvdd_ratio, williams_r), top-only (unrealized_sell_risk), null input, and boundary values.

## 3. Backend Renormalization Endpoint

- [x] 3.1 Implement `POST /api/metrics/renormalize/:metric_name` endpoint in `backend/index.ts`. Load thresholds from `metric_config`, read all `timeseries_metrics` rows for the metric, apply `normalizeValue()` to each `raw_value`, and bulk-update `normalized_value` in a single transaction. Return `{success, metric_name, rows_updated}`.
- [x] 3.2 Handle error cases: metric not in `metric_config` → 404, empty metric name → 400, database error → 500 with transaction rollback.
- [x] 3.3 Add unit tests in `backend/index.test.ts` for the renormalize endpoint: successful renormalization, metric not found (404), metric with no timeseries data (200 with rows_updated=0).

## 4. Backend Defaults API Endpoint

- [x] 4.1 Implement `GET /api/metrics/config/defaults` endpoint in `backend/index.ts` that returns the hardcoded SEED_DATA as a JSON array of `{metric_name, t_minus_2, t_minus_1, t_zero, t_plus_1, t_plus_2}` objects. This must be sourced from the SEED_DATA constant, not from the database.
- [x] 4.2 Add unit test in `backend/index.test.ts` verifying the defaults endpoint returns the correct seed values and is independent of database state.

## 5. Frontend API Client Extensions

- [x] 5.1 Add `renormalizeMetric(metricName: string)` function to `frontend/src/api/client.ts` that calls `POST /api/metrics/renormalize/:metric_name`.
- [x] 5.2 Add `fetchMetricConfigDefaults()` function to `frontend/src/api/client.ts` that calls `GET /api/metrics/config/defaults`.
- [x] 5.3 Add `saveMetricConfig(config: MetricConfig)` function to `frontend/src/api/client.ts` that calls `POST /api/metrics/config` (verify this already exists or add it).

## 6. Frontend ThresholdEditor Component

- [x] 6.1 Create `frontend/src/components/ThresholdEditor.tsx` with 5 number inputs (t_plus_2, t_plus_1, t_zero, t_minus_1, t_minus_2), Save button, and Reset to Defaults button. Inputs accept empty values for null thresholds. Show auto-detected direction (NORMAL/INVERTED). Style consistently with the existing dashboard (monospace, dark theme, minimal).
- [x] 6.2 Implement dirty state tracking: compare current input values against the last-saved config. Show "UNSAVED CHANGES" indicator and highlight the Save button when dirty. Clear dirty state after successful save.
- [x] 6.3 Implement the save flow: Save → `POST /api/metrics/config` → `POST /api/metrics/renormalize/:metric_name` → re-fetch metric data + composite data + configs. Show loading spinner during the cycle. Surface errors on failure.
- [x] 6.4 Implement the reset flow: Reset → `GET /api/metrics/config/defaults` → find matching metric → populate editor fields (does NOT auto-save). Show message if no defaults found.

## 7. Frontend Integration into MetricDetail

- [x] 7.1 Replace the read-only "VALUATION.THRESHOLD.MATRICES" panel in `MetricDetail.tsx` (lines 372-418) with the `ThresholdEditor` component. Pass current config, metric name, and callbacks for save/refresh.
- [x] 7.2 Wire up the post-save refresh: after ThresholdEditor saves and renormalizes, re-fetch `detailData` (metric timeseries), `compositeData`, and `configs` in DashboardLayout.tsx. Update MetricDetail charts and CompositeChart with the new data.
- [x] 7.3 Ensure threshold price lines on the RAW METRIC VALUE chart update after save (the chart re-renders with new config values).

## 8. Manual Validation

- [x] 8.1 Start the system (`bun run dev` in backend and frontend). Open a metric detail view (e.g., `terminal_price_ratio`). Verify the ThresholdEditor shows the current threshold values. Change a threshold, click Save, and verify: (a) the RAW METRIC VALUE chart threshold lines update, (b) the DYNAMIC VALUATION SCORE chart re-renders with new normalized values, (c) the COMPOSITE OSCILLATOR updates.
- [x] 8.2 Click "Reset to Defaults" for a modified metric. Verify the editor fields revert to seed values. Click Save and verify charts update back to original normalization.
- [x] 8.3 Restart the backend server. Verify user-modified thresholds are preserved (not overwritten by seeds).

## 9. Auto-Verification

- [x] 9.1 Read all artifacts (proposal.md, design.md, specs/threshold-editor/spec.md, specs/metric-renormalization/spec.md, specs/metric-normalization/spec.md, tasks.md) and verify every SHALL/MUST requirement has corresponding implementation code.
- [x] 9.2 Run `python -m pytest -xvs` to verify all Python tests pass.
- [x] 9.3 Run `bun test` in `backend/` to verify all backend tests pass.
- [x] 9.4 Launch the Hono server locally and run E2E verification with `curl`: (a) `GET /api/metrics/config/defaults` returns seed data, (b) `POST /api/metrics/config` saves a custom threshold, (c) `POST /api/metrics/renormalize/:metric_name` returns success, (d) `GET /api/metrics/config/:metric_name` reflects the custom threshold, (e) restart server and verify custom threshold persists.
- [x] 9.5 Spawn parallel reviewer subagents to audit the implementation for correctness (TypeScript normalize parity with Python), conventions (code style, naming), and spec compliance.
