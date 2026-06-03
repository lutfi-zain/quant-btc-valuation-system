## Context

The BTC Cycle Valuation System normalizes 17 raw metrics to a [-2, +2] scale using piecewise linear interpolation against 5 threshold levels (t_plus_2, t_plus_1, t_zero, t_minus_1, t_minus_2) stored in the `metric_config` SQLite table. Today, thresholds are hardcoded in two places:

1. **`backend/index.ts`** lines 119–149: SEED_DATA array with `INSERT OR REPLACE` on every server startup
2. **`quant/seed_metric_config.py`** lines 9–49: Python seeder script with `INSERT OR REPLACE`

Both use `INSERT OR REPLACE`, so any user-saved thresholds are overwritten. The existing `POST /api/metrics/config` endpoint can save thresholds, but the data is lost on the next restart. The frontend `MetricDetail.tsx` currently shows thresholds in a read-only "VALUATION.THRESHOLD.MATRICES" panel (lines 372–418) but offers no editing capability.

**Normalization flow**: Each Python component calls `normalize_metric()` from `quant/components/normalization.py`, which loads thresholds from `metric_config` and applies piecewise interpolation. The resulting `normalized_value` is stored in `timeseries_metrics`. The composite oscillator (`GET /api/composite`) averages these normalized values per date.

## Goals / Non-Goals

**Goals:**
- Allow users to edit threshold values per metric from the frontend, persist them across restarts
- Provide a reset-to-defaults mechanism per metric
- When thresholds are saved, recalculate all `normalized_value` entries for that metric without re-fetching raw data
- After recalculation, the composite oscillator and dynamic score charts update to reflect the new thresholds

**Non-Goals:**
- Bulk threshold editing across all metrics at once (per-metric editing only)
- Threshold import/export functionality
- Threshold versioning or history tracking
- Changing the normalization algorithm itself (piecewise linear interpolation is unchanged)
- Adding new metrics — this change only configures existing ones

## Decisions

### Decision 1: Seed strategy — `INSERT OR IGNORE` instead of `INSERT OR REPLACE`

**Choice**: Change both seed locations (backend startup + Python seeder) to use `INSERT OR IGNORE`.

**Rationale**: This is the simplest change that preserves user customizations. If a `metric_config` row already exists for a given `metric_name`, the seed is skipped. New metrics added in future will still be auto-seeded. No schema migration needed.

**Alternative considered**: Add a `is_user_modified` boolean column and only overwrite non-user-modified rows. Rejected — adds schema complexity for no meaningful benefit since `INSERT OR IGNORE` achieves the same result more simply.

### Decision 2: Renormalization done in TypeScript (Hono backend), not Python

**Choice**: Implement the renormalization logic directly in the Hono backend's `POST /api/metrics/renormalize/:metric_name` handler using TypeScript, reading `metric_config` thresholds and updating `timeseries_metrics.normalized_value` in-place.

**Rationale**: The normalization function is pure math (piecewise linear interpolation). Porting the ~100 lines of `normalization.py` logic to TypeScript avoids spawning a Python subprocess for a simple mathematical recalculation. This keeps the save → renormalize → respond flow fast (single Bun process, direct SQLite access, no IPC overhead).

**Alternative considered**: Call `python3 -m quant.renormalize` as a subprocess (like the existing pipeline endpoint does). Rejected — adds 2-5 seconds of Python startup latency for every threshold save, which would feel sluggish in the interactive UI. The pipeline endpoint uses Python because it needs to fetch external data; renormalization only needs math + SQLite.

### Decision 3: Default seed values exposed via API endpoint

**Choice**: Add a `GET /api/metrics/config/defaults` endpoint that returns the hardcoded SEED_DATA as a JSON array.

**Rationale**: The frontend reset button needs to know the original default values. Hardcoding them in the frontend would create a third copy. Exposing them from the backend's existing SEED_DATA constant keeps a single source of truth.

**Alternative considered**: Store defaults in a separate `metric_config_defaults` table. Rejected — adds schema complexity for a read-only reference dataset that never changes at runtime.

### Decision 4: Frontend ThresholdEditor as an inline component within MetricDetail

**Choice**: Replace the read-only "VALUATION.THRESHOLD.MATRICES" panel at the bottom of `MetricDetail.tsx` with an editable `ThresholdEditor` component. The editor renders inline (not a modal), with 5 number inputs for t_plus_2, t_plus_1, t_zero, t_minus_1, t_minus_2, plus Save and Reset buttons.

**Rationale**: Inline editing keeps the user in context — they can see the RAW METRIC VALUE CHART with threshold lines directly above the editor, making it obvious how their changes affect the visualization. The existing layout already has the thresholds panel at the bottom of MetricDetail, so this is a natural replacement.

### Decision 5: Post-save refresh flow

**Choice**: After a successful save + renormalize call:
1. Frontend re-fetches `GET /api/metrics/:metric_name` to get updated `normalized_value` data
2. Frontend re-fetches `GET /api/composite` to get updated composite oscillator
3. Frontend re-fetches `GET /api/metrics/configs` to update all configs in state
4. Charts re-render with new data

**Rationale**: This is the simplest approach and guarantees consistency. The data volume is small (a few thousand rows per metric), so the re-fetch overhead is negligible (< 200ms total).

## Risks / Trade-offs

**[Risk] Renormalization in TypeScript diverges from Python normalization** → The TypeScript renormalization function must produce bit-identical results to `quant/components/normalization.py`. Mitigation: Write test cases comparing outputs of both implementations against the same inputs. Include the exact same edge-case handling (NaN, None, one-sided metrics, inverted metrics).

**[Risk] Large timeseries update blocks SQLite** → For metrics with ~5000+ rows, the `UPDATE` query could briefly lock the database. Mitigation: Use a single `UPDATE ... SET normalized_value = CASE WHEN ...` bulk query wrapped in a transaction, which executes in < 100ms for typical row counts.

**[Risk] Frontend state becomes stale after threshold save** → If the user saves thresholds but the re-fetch fails silently, the charts could show stale data. Mitigation: Show a loading indicator during the save+refetch cycle and surface errors prominently.

**[Trade-off] TypeScript + Python normalization duplication** → Accepting this duplication for performance reasons. The normalization algorithm is stable and well-tested, so the maintenance burden is low.
