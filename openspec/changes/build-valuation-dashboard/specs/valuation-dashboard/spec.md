# valuation-dashboard Specification

## Purpose
Define the React frontend dashboard that visualizes all 17 BTC valuation components and the composite oscillator. The dashboard provides a unified view of the system's Fundamental, Technical, and Sentiment indicators with interactive charts, category navigation, and color-coded normalized valuation scores.

## ADDED Requirements

### Requirement: Dashboard Layout
The frontend SHALL render a dashboard layout composed of a fixed sidebar and a scrollable main content area. The sidebar SHALL remain visible at all times and occupy a fixed width on the left side of the viewport. The main content area SHALL fill the remaining viewport width.

The sidebar SHALL contain three collapsible category sections:
1. **Fundamental Indicators** — containing 7 metrics: AVIV Ratio-Z, AVIV NUPL, CVDD Ratio, MVRV-Z, LTH/STH SOPR Ratio, Terminal Price Ratio, Unrealized Sell-Side Risk Ratio
2. **Technical Indicators** — containing 8 metrics: Rolling 52W Sharpe Ratio, Pi Cycle Top, VPLI, Risk Metrics, DVRSI, Williams %R, 2 Year MA, Bitcoin Ahr999 Index
3. **Sentiment Indicators** — containing 2 metrics: OG Fear & Greed, CMC Fear & Greed

Each sidebar item SHALL display the metric name and its current normalized score with the appropriate color coding.

#### Scenario: Dashboard initial load
- **WHEN** the user navigates to the dashboard root URL
- **THEN** the sidebar SHALL be visible with all three category sections expanded by default
- **AND** the main content area SHALL display the Composite Oscillator Chart at the top followed by the MetricCard grid grouped by category

#### Scenario: Sidebar category collapse
- **WHEN** the user clicks a category section header in the sidebar (e.g., "Technical Indicators")
- **THEN** the metric list under that category SHALL toggle between collapsed and expanded states
- **AND** other category sections SHALL remain in their current state

#### Scenario: Sidebar metric click navigation
- **WHEN** the user clicks a metric name in the sidebar (e.g., "MVRV-Z")
- **THEN** the main content area SHALL scroll to and highlight the corresponding MetricCard in the grid

---

### Requirement: Composite Oscillator Chart
The main content area SHALL display a Composite Oscillator Chart at the top as the primary dashboard visualization. The chart SHALL use the Recharts `ComposedChart` component with a `ResponsiveContainer` wrapper.

The chart SHALL have dual Y-axes:
- **Left Y-axis**: BTC price in USD, rendered with a logarithmic scale
- **Right Y-axis**: Composite oscillator value, bounded from -2 to +2 with a linear scale

The chart SHALL render:
1. A **line series** for BTC price plotted against the left Y-axis
2. A **line series** for the composite oscillator value plotted against the right Y-axis
3. **Horizontal color bands** on the right Y-axis area indicating valuation zones:
   - Green band: +1 to +2 (High Value / Bottom zone — buy signal)
   - Yellow band: -1 to +1 (Neutral zone)
   - Red band: -2 to -1 (Low Value / Peak zone — sell signal)

The X-axis SHALL display dates. The chart SHALL include a crosshair tooltip showing the date, BTC price, and composite oscillator value on hover.

#### Scenario: Composite chart renders with data
- **WHEN** the dashboard loads and the `GET /api/composite` endpoint returns timeseries data
- **THEN** the chart SHALL render BTC price on the left Y-axis (log scale) and the composite oscillator on the right Y-axis (-2 to +2)
- **AND** the color bands (green, yellow, red) SHALL be visible as background reference areas behind the oscillator line

#### Scenario: Composite chart tooltip interaction
- **WHEN** the user hovers over any point on the Composite Oscillator Chart
- **THEN** a tooltip SHALL appear showing:
  - `date`: the data point date (formatted as YYYY-MM-DD)
  - `btc_price`: the BTC price in USD (formatted with comma separators)
  - `composite_score`: the composite oscillator value (formatted to 2 decimal places)

#### Scenario: Composite chart with no data
- **WHEN** the `GET /api/composite` endpoint returns an empty `data` array
- **THEN** the chart area SHALL display a centered message: "No composite data available. Run the data pipeline to populate metrics."

---

### Requirement: MetricCard Grid with Category Grouping
The main content area SHALL display MetricCards in a responsive grid layout below the Composite Oscillator Chart. The cards SHALL be organized under category section headers matching the three pillars.

Each category section SHALL have:
1. A section header displaying the category name and the count of metrics (e.g., "Fundamental Indicators (7)")
2. A grid of MetricCards for that category's metrics, rendered in a responsive CSS grid (3 columns on large screens, 2 on medium, 1 on small)

The category sections SHALL appear in the following order:
1. Fundamental Indicators
2. Technical Indicators
3. Sentiment Indicators

#### Scenario: Grid renders all 17 metrics
- **WHEN** the dashboard loads and `GET /api/metrics` returns data for all 17 metrics
- **THEN** the grid SHALL render 7 cards under "Fundamental Indicators", 8 cards under "Technical Indicators", and 2 cards under "Sentiment Indicators"

#### Scenario: Grid renders partial data
- **WHEN** `GET /api/metrics` returns data for only a subset of metrics (e.g., only 3 have data)
- **THEN** the grid SHALL render MetricCards for only the metrics that have data
- **AND** metrics without data SHALL still appear as cards with an "Awaiting data" placeholder state

---

### Requirement: MetricCard Display
Each MetricCard SHALL be a rectangular card component displaying summary information for a single valuation metric. The card SHALL contain:

1. **Metric name**: displayed as the card title (e.g., "MVRV-Z", "Pi Cycle Top")
2. **Current raw value**: the most recent raw metric value, formatted to appropriate decimal places
3. **Current normalized score**: the most recent normalized value (-2 to +2), displayed as a numeric badge with color coding per the Color Coding requirement
4. **Mini chart**: a small sparkline-style Recharts `LineChart` showing the metric's normalized value over the most recent 90 days, with no axis labels or legends

The MetricCard SHALL have a hover effect (subtle shadow/elevation change) to indicate interactivity.

#### Scenario: MetricCard displays current values
- **WHEN** the metric "MVRV-Z" has a latest `raw_value` of 2.45 and `normalized_value` of -0.8
- **THEN** the MetricCard SHALL display:
  - Title: "MVRV-Z"
  - Raw value: "2.45"
  - Normalized score badge: "-0.80" with an orange-red color per the color coding gradient
  - Mini chart: sparkline of the last 90 days of normalized values

#### Scenario: MetricCard with no data
- **WHEN** a metric exists in the category definition but has no timeseries data from the API
- **THEN** the MetricCard SHALL display the metric name with "—" for raw value and normalized score
- **AND** the mini chart area SHALL show an "Awaiting data" text placeholder instead of a chart

---

### Requirement: Metric Detail Expanded View
When a user interacts with a MetricCard, the system SHALL display an expanded detail view for that metric. The expanded view SHALL overlay or replace the grid section with a full-width panel.

The detail view SHALL contain:
1. **Header**: metric name, category label, and a close/back button
2. **Dual-axis chart**: a full-size Recharts `ComposedChart` with:
   - Left Y-axis: BTC price (log scale)
   - Right Y-axis: raw metric value (linear scale)
   - A line series for BTC price
   - A line series for the raw metric value
   - An area/line overlay for the normalized value (-2 to +2) with the color band background (green/yellow/red) matching the Composite Oscillator Chart
3. **Stats panel**: displaying the metric's current raw value, normalized score, min/max raw values, and the normalization thresholds (t_minus_2, t_minus_1, t_zero, t_plus_1, t_plus_2)

#### Scenario: Expanding a MetricCard
- **WHEN** the user clicks on the "Pi Cycle Top" MetricCard
- **THEN** the detail view SHALL open showing the full-size dual-axis chart with BTC price and Pi Cycle Top raw values
- **AND** the normalized overlay with color bands SHALL be visible
- **AND** the stats panel SHALL display the current values and normalization thresholds

#### Scenario: Closing the detail view
- **WHEN** the user clicks the close/back button on the detail view
- **THEN** the detail view SHALL close and the MetricCard grid SHALL be visible again at the previous scroll position

#### Scenario: Detail view data loading
- **WHEN** the user clicks a MetricCard and the full timeseries data has not yet been fetched
- **THEN** the detail view SHALL display a loading skeleton for the chart area
- **AND** once `GET /api/metrics/:metric_name` completes, the chart SHALL render with the received data

---

### Requirement: Data Fetching and Loading States
The dashboard SHALL fetch data from the Hono API using the following endpoints:

1. `GET /api/metrics` — fetch summary data for all metrics (used for MetricCard grid). The response SHALL contain an array of metric objects, each with: `metric_name`, `category`, `latest_raw_value`, `latest_normalized_value`, `sparkline_data` (array of recent normalized values).
2. `GET /api/metrics/:metric_name` — fetch full timeseries for a specific metric (used for detail view). The response SHALL contain `metric_name` and `data` array with objects containing: `date`, `raw_value`, `normalized_value`, `btc_price`.
3. `GET /api/composite` — fetch composite oscillator timeseries. The response SHALL contain `data` array with objects containing: `date`, `composite_score`, `btc_price`.

The dashboard SHALL implement the following loading states:
- **Initial load**: full-page skeleton with placeholder shapes for the Composite Oscillator Chart and MetricCard grid
- **MetricCard grid loading**: individual card skeletons while `GET /api/metrics` is in flight
- **Detail view loading**: chart skeleton while `GET /api/metrics/:metric_name` is in flight
- **Error state**: if any API call fails, display an inline error message with a "Retry" button in the affected area

Data SHALL be fetched on initial dashboard mount. The dashboard SHALL NOT auto-refresh data; the user must manually reload the page to fetch updated data.

#### Scenario: Dashboard initial data load
- **WHEN** the dashboard mounts for the first time
- **THEN** the system SHALL simultaneously call `GET /api/metrics` and `GET /api/composite`
- **AND** a loading skeleton SHALL be displayed for both the Composite Oscillator Chart and the MetricCard grid
- **AND** once both responses arrive, the full dashboard SHALL render

#### Scenario: API error on initial load
- **WHEN** the `GET /api/metrics` call fails with a network error or non-200 status
- **THEN** the MetricCard grid area SHALL display an error message: "Failed to load metrics. Check your connection and try again."
- **AND** a "Retry" button SHALL be displayed that re-triggers the `GET /api/metrics` call when clicked

#### Scenario: API error on composite load
- **WHEN** the `GET /api/composite` call fails
- **THEN** the Composite Oscillator Chart area SHALL display an error message: "Failed to load composite oscillator data."
- **AND** a "Retry" button SHALL be displayed
- **AND** the MetricCard grid below SHALL still render normally if its data loaded successfully

#### Scenario: Detail view data fetch
- **WHEN** the user clicks a MetricCard for "AVIV Ratio-Z"
- **THEN** the system SHALL call `GET /api/metrics/aviv_ratio_z`
- **AND** a loading skeleton SHALL be shown in the detail view chart area until the response arrives

---

### Requirement: Color Coding for Normalized Values
All normalized values displayed in the dashboard (MetricCard badges, chart overlays, sidebar indicators) SHALL use a continuous color gradient mapped to the -2 to +2 scale:

- **+2.0** (High Value / Bottom): `#16a34a` (green-600) — strong buy signal
- **+1.0**: `#4ade80` (green-400) — moderate value
- **0.0** (Neutral): `#facc15` (yellow-400) — neutral
- **-1.0**: `#fb923c` (orange-400) — moderate overvaluation
- **-2.0** (Low Value / Peak): `#dc2626` (red-600) — strong sell signal

Values between these anchor points SHALL be interpolated linearly to produce a smooth gradient. Values beyond the bounds (below -2 or above +2) SHALL clamp to the boundary color.

The color coding SHALL be applied to:
1. The normalized score badge on each MetricCard
2. The sidebar metric score indicators
3. The composite oscillator line color (segmented or gradient-colored based on current value)
4. The background color bands on charts (green band for +1 to +2, yellow for -1 to +1, red for -2 to -1)

#### Scenario: Color for positive normalized value
- **WHEN** a metric has a normalized value of +1.5
- **THEN** the badge color SHALL be interpolated between `#4ade80` (+1.0) and `#16a34a` (+2.0), resulting in a medium-green hue

#### Scenario: Color for negative normalized value
- **WHEN** a metric has a normalized value of -1.8
- **THEN** the badge color SHALL be interpolated between `#fb923c` (-1.0) and `#dc2626` (-2.0), resulting in a deep orange-red hue

#### Scenario: Color for neutral value
- **WHEN** a metric has a normalized value of 0.0
- **THEN** the badge color SHALL be `#facc15` (yellow-400)

#### Scenario: Color clamping for out-of-bounds value
- **WHEN** a metric has a normalized value of +2.5 (beyond the +2 bound)
- **THEN** the badge color SHALL clamp to `#16a34a` (green-600), the color for +2.0
