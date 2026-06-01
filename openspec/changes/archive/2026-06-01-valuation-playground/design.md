## Context

The BTC Cycle Valuation System aggregates multiple metrics to determine Bitcoin's cycle positioning on a scale from -2 to +2. Currently, normalization is static and handled by the Python backend via standard statistical bounds. The user has requested a "Playground UI" to manually adjust the threshold levels (-2, -1, 0, +1, +2) directly from the frontend interface and see the real-time effect on a localized Valuation chart, and subsequently save this configuration. 

## Goals / Non-Goals

**Goals:**
- Provide a dual-chart view: one showing the raw metric (Playground Chart) and another showing the mapped oscillator output (Valuation Output).
- Allow users to manually configure boundaries (Thresholds for -2, -1, 0, +1, +2) in the Playground Chart.
- Save the configured thresholds into the SQLite database.
- Recalculate the valuation output based on the user-defined thresholds dynamically.

**Non-Goals:**
- Applying standard statistical distribution math when user thresholds are active (the user manually defines the linear mapping between thresholds).
- Implementing complete authentication/user sessions (the config will be applied globally per metric for now).

## Decisions

- **Threshold Configuration State**: The frontend will maintain a local state array containing `[minThreshold (-2), lowThreshold (-1), midThreshold (0), highThreshold (1), maxThreshold (2)]`. Draggable or input-based fields will update this array.
- **Valuation Mapping**: Instead of using mean/std, the frontend (or backend API) will linearly interpolate the raw metric data based on the threshold bounds to generate the Valuation Output chart dynamically. 
- **Database Schema (Backend)**: We will create a `metric_config` table in SQLite with columns `(metric_name, t_minus_2, t_minus_1, t_zero, t_plus_1, t_plus_2)`.
- **Charting Library**: We will continue using `lightweight-charts` to synchronize both the Playground Chart (raw values) and the Valuation Output Chart (-2 to +2 bounded values).

## Risks / Trade-offs

- **Risk: Performance on dynamic recalculation** → Mitigation: Calculating the linear threshold mapping across 6000+ rows is fast enough in JS. We will perform the manual interpolation on the frontend when thresholds change, avoiding excessive backend round-trips until the user clicks "Save Config".
- **Risk: Syncing Chart Crosshairs** → Mitigation: Lightweight charts already supports synchronized crosshairs via `subscribeCrosshairMove`. We just apply it between the Playground and Valuation chart instances.
