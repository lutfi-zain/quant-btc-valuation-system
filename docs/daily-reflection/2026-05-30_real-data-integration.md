# 📝 Daily Reflection: 2026-05-30

**Session:** Real Data Integration & Data Quality Handling
**Agent:** Antigravity
**Duration/Effort:** ~1 Hour / Medium

## 1. What I Did
- [x] Swapped mock data pipeline in `aviv_ratio.py` to fetch real On-Chain data from `bitview.space` API.
- [x] Investigated HTML structure of `checkonchain.com` and deduced it embeds Plotly data. Looked for an alternative robust API.
- [x] Analyzed and handled data padding/null anomalies in real `aviv_ratio` datasets (skipping early `null` data points to prevent standard deviation skew).
- [x] Purged legacy mock data from SQLite (`metrics.db`) to ensure the transition to live data wouldn't conflict with or artificially inflate metrics length.
- [x] Evaluated and verified accurate length mappings from 2009 onwards, resulting in `6352` valid rows.

## 2. Key Findings
- **Finding 1:** `bitview.space` offers reliable unauthenticated APIs (`/api/series/aviv_ratio/day1/data`) for both OHLC and fundamental indicators, making it a better target than scraping `checkonchain.com` HTML Plotly exports.
- **Finding 2:** Early records of Bitcoin's historical metrics sometimes contain `null` or constant dummy values. Standardizing these bounds properly is vital, as naive inclusion skews the global Z-score's `mean` and `std`.

## 3. Decisions Made
| Decision | Rationale | Alternatives Considered |
|---|---|---|
| **Skip `null` row entries in data ingestion** | Real AVIV data has `null` values early in Bitcoin's life (2009). If not filtered, Python's `float(row)` throws an error. | Replacing `null` with `0.0`, which would disastrously skew the Z-Score's global mean downwards. |
| **Delete existing `aviv_ratio` metrics via SQL** | Since `INSERT OR REPLACE` matches `date` and the mock script generated values into the future, overlapping arrays bloated the DB table to 10k+ rows instead of 6352. | Writing an explicit python script to loop and delete, or leaving the old mock data (which would break future charts). |

## 4. Artifacts
| File | Action | Description |
|---|---|---|
| `quant/aviv_ratio.py` | Modified | Rewrote `fetch_aviv_data` to consume real `bitview.space` endpoint and handle `null` arrays gracefully. |

## 5. Session Metrics
- **Energy:** High
- **Focus:** Deep
- **Satisfaction:** High

## 6. Blockers & Challenges
- Encountered a misleading row count (10,357 vs 6,352) because the mock generator created data into future dates that were not overridden by the real API.
- Had to identify that `checkonchain.com` embeds its raw data directly inside JS objects on the page, making it annoying to parse, but pivot to `bitview.space` solved it cleanly.

## 7. Next Steps
- [ ] Add other indicators like MVRV Z-Score using the same `bitview.space` data paradigm.
- [ ] Implement backend pagination or chunking if the single JSON response of 6k+ items ever gets too heavy for the React frontend over HTTP.

## 8. Notes
- Re-tested the Z-score logic. The math binds values between `-2.0` and `+2.0`. The user correctly asked why the mock data didn't hit those extremes — it was because the hardcoded sine-wave generator didn't reach the required variance to surpass the standard deviations limit. Real data will actually touch these limits when cycle tops occur.
