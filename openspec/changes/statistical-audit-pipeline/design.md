## Context

The BTC Cycle Valuation System aggregates 17 on-chain, sentiment, and technical indicators into a composite oscillator bounded [-2, +2]. Each indicator is normalized via piecewise linear interpolation using manually-set thresholds stored in `metric_config`. The composite oscillator is computed as `AVG(normalized_value)` across all available indicators per date.

**Current problem**: The composite oscillator range is empirically constrained to approximately [-0.86, +1.2] — far short of the theoretical [-2, +2] bounds. This occurs because:
1. Simple averaging of 17 independent indicators suppresses extremes (Central Limit Theorem effect)
2. Individual indicator thresholds are unvalidated against historical distributions
3. No coherency or correlation analysis exists to assess signal redundancy

## Goals / Non-Goals

**Goals:**
- Implement a statistical audit module that validates each indicator's normalization against historical data
- Replace the simple `AVG()` composite with a **rescaled aggregation** that achieves [-2, +2] at historical extremes
- Provide threshold recalibration recommendations based on percentile analysis
- Compute and expose inter-indicator correlation matrix
- Make audit results accessible via API and visible on the dashboard
- Maintain backward compatibility — individual indicator normalized values remain unchanged

**Non-Goals:**
- Changing the piecewise linear normalization logic itself (the approach is sound; only thresholds may need adjustment)
- Implementing machine learning or advanced signal processing
- Changing the data ingestion pipeline or scraping logic
- Redesigning the frontend dashboard (only adding an audit panel)

## Decisions

### Decision 1: Rescaled Mean Aggregation (over weighted average or PCA)

**Chosen approach**: Compute `raw_composite = AVG(normalized_values)` as before, then apply a monotonic rescaling function to map the raw composite to the full [-2, +2] range.

**Rescaling method**: Use the historical distribution of `raw_composite` to fit a percentile-based mapping:
- Historical min → -2
- Historical 2.5th percentile → -2
- Historical 50th percentile → 0
- Historical 97.5th percentile → +2
- Historical max → +2

This uses piecewise linear interpolation between these anchor points, identical in principle to how individual indicators are normalized.

**Why not weighted averaging?** Weights would require subjective judgment about indicator importance, creating maintenance burden and overfitting risk. The user's doc explicitly doesn't prioritize any indicator category.

**Why not PCA?** PCA would extract orthogonal factors but destroys interpretability — users can no longer understand what the composite means in terms of individual indicators.

**Why rescaled mean?** It preserves the simple, interpretable average while ensuring the output reaches the target bounds. The rescaling parameters are computed from historical data and stored in the database for reproducibility.

### Decision 2: Audit Module Architecture

```
quant/audit/
├── __init__.py
├── distribution.py    # Per-indicator distribution stats (mean, std, skew, kurtosis, percentiles)
├── threshold.py       # Threshold validation and recalibration suggestions
├── correlation.py     # Inter-indicator correlation matrix
├── composite.py       # Composite rescaling parameter fitting
└── runner.py          # Orchestrates full audit and stores results
```

Each module operates independently on data from `timeseries_metrics` and `metric_config` tables. The runner orchestrates all analyses and persists results to dedicated audit tables.

### Decision 3: SQLite Audit Tables

**`audit_indicator_stats`**: Per-indicator distribution statistics
```sql
CREATE TABLE audit_indicator_stats (
    metric_name TEXT NOT NULL,
    run_date TEXT NOT NULL,
    count INTEGER,
    mean REAL, std REAL, skewness REAL, kurtosis REAL,
    p2_5 REAL, p5 REAL, p25 REAL, p50 REAL, p75 REAL, p95 REAL, p97_5 REAL,
    min_val REAL, max_val REAL,
    pct_at_plus2 REAL, pct_at_minus2 REAL,
    PRIMARY KEY (metric_name, run_date)
);
```

**`audit_correlation_matrix`**: Pairwise correlation coefficients
```sql
CREATE TABLE audit_correlation_matrix (
    metric_a TEXT NOT NULL,
    metric_b TEXT NOT NULL,
    run_date TEXT NOT NULL,
    pearson REAL,
    spearman REAL,
    PRIMARY KEY (metric_a, metric_b, run_date)
);
```

**`audit_composite_params`**: Rescaling parameters for the composite oscillator
```sql
CREATE TABLE audit_composite_params (
    run_date TEXT NOT NULL PRIMARY KEY,
    raw_min REAL, raw_max REAL,
    raw_p2_5 REAL, raw_p50 REAL, raw_p97_5 REAL,
    rescale_method TEXT DEFAULT 'percentile_piecewise'
);
```

### Decision 4: Backend API Extension

New endpoint: `GET /api/audit/summary` → returns latest audit results including:
- Per-indicator stats array
- Correlation matrix
- Composite rescaling parameters
- Composite range coverage statistics

The existing `GET /api/composite` endpoint will apply rescaling using the latest `audit_composite_params` entry.

### Decision 5: Frontend Audit Panel

A new `AuditPanel` component will be added to the dashboard showing:
- Distribution stats table with color-coded threshold coverage
- Correlation heatmap (using canvas-based rendering for performance)
- Composite range histogram showing before/after rescaling

## Risks / Trade-offs

**[Risk: Rescaling overfits to historical data]** → Mitigation: Use robust percentiles (2.5th/97.5th) rather than min/max. Refit periodically (via `run_audit`). Store parameters in DB for auditability. The piecewise linear approach is monotonic and cannot invert signals.

**[Risk: Indicators may have insufficient historical data]** → Mitigation: Audit module reports data coverage per indicator. Indicators with < 365 days of data are flagged and excluded from composite rescaling calibration.

**[Risk: Correlation analysis may suggest dropping indicators]** → Mitigation: Correlation matrix is informational only. No automatic indicator removal — the user decides based on audit results.

**[Risk: scipy dependency]** → Mitigation: scipy is standard for scientific Python. It's already commonly available and only adds ~30MB. Only used in audit module, not in the hot path.
