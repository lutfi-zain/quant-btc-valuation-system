## 1. Audit Module Setup & Distribution Analysis

- [ ] 1.1 Create `quant/audit/` module structure with `__init__.py`, `distribution.py`, `threshold.py`, `correlation.py`, `composite.py`, and `runner.py`. Add `scipy` and `numpy` to `requirements.txt` if not present.
- [ ] 1.2 Create SQLite migration for audit tables: `audit_indicator_stats`, `audit_correlation_matrix`, `audit_composite_params`. Add table creation to database initialization.
- [ ] 1.3 Implement `distribution.py`: query `timeseries_metrics` per indicator, compute count, mean, std, skewness, kurtosis, percentiles (2.5, 5, 25, 50, 75, 95, 97.5), min, max, and percentage of values at ±2 boundaries. Store results in `audit_indicator_stats`.
- [ ] 1.4 Write pytest tests for `distribution.py`: verify stats computation on synthetic data, handle edge cases (empty data, single data point, <30 data points with insufficient-data flag).

## 2. Threshold Validation & Recalibration

- [ ] 2.1 Implement `threshold.py`: load thresholds from `metric_config`, load raw metric values from `timeseries_metrics`, compare thresholds against actual data percentiles. Report status (`well_calibrated`, `over_conservative`, `under_conservative`) and generate suggested thresholds.
- [ ] 2.2 Write pytest tests for `threshold.py`: test with known distributions where thresholds are clearly too tight or too loose, verify suggested thresholds match expected percentiles.

## 3. Correlation Analysis

- [ ] 3.1 Implement `correlation.py`: pivot `timeseries_metrics` by date and metric_name, compute pairwise Pearson and Spearman correlations, flag pairs with |correlation| > 0.85 as `highly_correlated`. Store results in `audit_correlation_matrix`.
- [ ] 3.2 Write pytest tests for `correlation.py`: verify correlation computation on synthetic perfectly-correlated and uncorrelated data, verify high-correlation flagging.

## 4. Composite Rescaling

- [ ] 4.1 Implement `composite.py`: compute `raw_composite = AVG(normalized_value)` per date from `timeseries_metrics`, fit percentile-based rescaling parameters (p2.5, p50, p97.5), store in `audit_composite_params`. Provide `rescale(raw_value, params)` function using piecewise linear interpolation.
- [ ] 4.2 Write pytest tests for `composite.py`: verify rescaling maps p2.5 → -2, p50 → 0, p97.5 → +2 exactly, verify interpolation between anchor points, verify fallback when no params exist.

## 5. Audit Runner & CLI

- [ ] 5.1 Implement `runner.py`: orchestrate full audit pipeline (distribution → threshold → correlation → composite), return results dict, print summary report. Support CLI invocation via `python -m quant.audit.runner --db-path database/metrics.db`.
- [ ] 5.2 Write pytest tests for `runner.py`: verify full pipeline execution on test database, verify results dict structure, verify summary report output.

## 6. Backend API Changes

- [ ] 6.1 Add `GET /api/audit/summary` endpoint to `backend/index.ts`: query latest audit results from all three audit tables, return JSON response. Handle 404 when no audit data exists.
- [ ] 6.2 Modify `GET /api/composite` endpoint in `backend/index.ts`: after computing `AVG(normalized_value)`, apply rescaling using latest `audit_composite_params`. Include both `composite_value` (rescaled) and `raw_composite_value` in the response.
- [ ] 6.3 Write backend tests for new/modified endpoints: verify audit summary response shape, verify composite rescaling is applied, verify fallback when no params exist.

## 7. Frontend Audit Panel

- [ ] 7.1 Create `AuditPanel.tsx` component with distribution stats table: display per-indicator mean, std, skewness, kurtosis, pct_at_plus2, pct_at_minus2. Color-code rows based on calibration status.
- [ ] 7.2 Add correlation heatmap to `AuditPanel.tsx`: render a canvas-based heatmap of the correlation matrix with color scale from -1 to +1. Highlight highly correlated pairs.
- [ ] 7.3 Add composite range histogram to `AuditPanel.tsx`: show distribution of raw composite vs. rescaled composite values as overlaid histograms.
- [ ] 7.4 Add `fetchAuditSummary()` to `frontend/src/api/client.ts` and route the audit panel in the dashboard navigation.
- [ ] 7.5 Write frontend tests for `AuditPanel` component rendering with mock data.

## 8. Integration & Verification

- [ ] 8.1 Run the full data pipeline (`python -m quant.run_all`) then run the audit (`python -m quant.audit.runner`) on the live database. Verify audit results are sensible and composite rescaling produces values in the [-2, +2] range at historical extremes.
- [ ] 8.2 Run all test suites: `python -m pytest --cov`, `cd backend && bun test`, `cd frontend && bun test`. Confirm 100% pass rate.
- [ ] 8.3 Start backend and frontend, visually verify the audit panel renders correctly with real data, and confirm the composite oscillator chart now shows values reaching closer to ±2.
- [ ] 8.4 Final auto-verification: read all artifacts (proposal, design, specs, tasks), verify every SHALL/MUST requirement against the code, launch Hono server and run E2E verification with curl, spawn parallel reviewer subagents to audit implementation for correctness and conventions.
