# threshold-editor Specification

## Purpose
Defines the frontend threshold configuration UI that allows users to edit, save, and reset-to-defaults the 5 threshold levels (t_plus_2, t_plus_1, t_zero, t_minus_1, t_minus_2) for each metric directly from the MetricDetail view. 

## Requirements

### Requirement: Inline Threshold Editor in MetricDetail

The frontend SHALL render an inline threshold editor below the chart panels in the MetricDetail view, replacing the current read-only "VALUATION.THRESHOLD.MATRICES" panel.

The editor SHALL display 5 editable numeric input fields, one for each threshold level:

| Field Label | Config Key | Description |
|---|---|---|
| +2 (Extreme Bottom) | `t_plus_2` | High value / extreme undervalued boundary |
| +1 (Accumulation) | `t_plus_1` | Moderate undervalued boundary |
| 0 (Midpoint) | `t_zero` | Neutral reference point (informational) |
| -1 (Distribution) | `t_minus_1` | Moderate overvalued boundary |
| -2 (Extreme Peak) | `t_minus_2` | Low value / extreme overvalued boundary |

Each input field SHALL accept `null` values (represented as an empty field) to support one-sided metrics (e.g., CVDD Ratio has no -1 or -2 thresholds).

The editor SHALL display the metric's auto-detected direction (NORMAL or INVERTED) based on the current threshold values.

#### Scenario: Editor renders with current config values

- **WHEN** the user opens MetricDetail for `terminal_price_ratio` and the current config is `{t_plus_2: 1, t_plus_1: 0.75, t_zero: null, t_minus_1: 0.25, t_minus_2: 0.17}`
- **THEN** the editor SHALL display 5 input fields pre-filled with values: `1`, `0.75`, empty, `0.25`, `0.17`
- **THEN** the editor SHALL show the direction as "INVERTED" (because `t_plus_2 > t_minus_2`)

#### Scenario: Editor renders for one-sided metric

- **WHEN** the user opens MetricDetail for `cvdd_ratio` and the current config is `{t_plus_2: 1.3, t_plus_1: 1.6, t_zero: null, t_minus_1: null, t_minus_2: null}`
- **THEN** the editor SHALL display `1.3` and `1.6` in the +2 and +1 fields
- **THEN** the -1 and -2 fields SHALL be empty (representing null)

#### Scenario: Editor renders for metric with no config

- **WHEN** the user opens MetricDetail for a metric that has no row in `metric_config`
- **THEN** the editor SHALL display all 5 fields as empty
- **THEN** the Save button SHALL still be functional

### Requirement: Save Threshold Configuration

When the user modifies threshold values and clicks Save, the frontend SHALL:
1. Send a `POST /api/metrics/config` request with the updated threshold values
2. On success, send a `POST /api/metrics/renormalize/:metric_name` request to recalculate normalized values
3. On success, re-fetch the metric's timeseries data (`GET /api/metrics/:metric_name`) and composite data (`GET /api/composite`) to update all charts

The Save button SHALL be disabled while the save+renormalize+refetch cycle is in progress.

The editor SHALL show a visual loading indicator during the save operation.

#### Scenario: Successful threshold save and chart update

- **WHEN** the user changes `t_minus_1` from `0.25` to `0.30` for `terminal_price_ratio` and clicks Save
- **THEN** the frontend SHALL POST `{metric_name: "terminal_price_ratio", t_plus_2: 1, t_plus_1: 0.75, t_zero: null, t_minus_1: 0.30, t_minus_2: 0.17}` to `/api/metrics/config`
- **THEN** the frontend SHALL POST to `/api/metrics/renormalize/terminal_price_ratio`
- **THEN** the RAW METRIC VALUE chart threshold lines SHALL update to reflect the new -1 value at 0.30
- **THEN** the DYNAMIC VALUATION SCORE chart SHALL update with recalculated normalized values
- **THEN** the COMPOSITE OSCILLATOR chart SHALL update to reflect the changed composite

#### Scenario: Save with null threshold values

- **WHEN** the user clears the -1 and -2 fields for a metric and clicks Save
- **THEN** the POST body SHALL contain `t_minus_1: null` and `t_minus_2: null`
- **THEN** the metric SHALL become a bottom-only metric after renormalization

#### Scenario: Save fails due to server error

- **WHEN** the user clicks Save but the `POST /api/metrics/config` returns HTTP 500
- **THEN** the editor SHALL display an error message
- **THEN** the threshold values in the editor SHALL remain as the user entered them (not reverted)
- **THEN** the charts SHALL NOT update

### Requirement: Reset to Default Thresholds

The editor SHALL include a "Reset to Defaults" button that restores the metric's thresholds to the original seed values.

When clicked, the frontend SHALL:
1. Fetch default values from `GET /api/metrics/config/defaults`
2. Find the matching metric in the defaults response
3. Populate the editor fields with the default values
4. NOT auto-save — the user must click Save to persist the reset

#### Scenario: Reset to defaults for a modified metric

- **WHEN** the user has changed `terminal_price_ratio` thresholds to custom values `{t_plus_2: 1.5, t_plus_1: 0.9, ...}`
- **THEN** clicking "Reset to Defaults" SHALL populate the editor with `{t_plus_2: 1, t_plus_1: 0.75, t_zero: null, t_minus_1: 0.25, t_minus_2: 0.17}`
- **THEN** the user SHALL need to click "Save" to persist the default values

#### Scenario: Reset for metric with no defaults

- **WHEN** the user clicks "Reset to Defaults" for a metric that does not appear in the defaults response
- **THEN** the editor SHALL display an informational message "No default values available for this metric"
- **THEN** the editor fields SHALL NOT change

### Requirement: Dirty State Tracking

The editor SHALL track whether the user has unsaved changes (dirty state).

When the editor is in a dirty state:
- The Save button SHALL be visually highlighted (enabled state)
- A visual indicator SHALL show "UNSAVED CHANGES"

When the editor is clean (no changes or after a successful save):
- The Save button SHALL be visually muted
- No unsaved indicator SHALL be shown

#### Scenario: User modifies a value

- **WHEN** the user changes any threshold input value from its current saved value
- **THEN** the editor SHALL enter dirty state
- **THEN** the "UNSAVED CHANGES" indicator SHALL appear

#### Scenario: User reverts to the saved value

- **WHEN** the user manually changes a threshold value back to its original saved value (and all fields match saved values)
- **THEN** the editor SHALL exit dirty state
- **THEN** the "UNSAVED CHANGES" indicator SHALL disappear

### Requirement: Default Threshold Values API Endpoint

The Hono backend SHALL expose a `GET /api/metrics/config/defaults` endpoint that returns the original seed threshold values for all metrics.

The response SHALL be a JSON array of objects with the same structure as `GET /api/metrics/configs`.

The default values SHALL be sourced from the backend's hardcoded SEED_DATA constant, NOT from the database (which may contain user-modified values).

#### Scenario: Successful defaults retrieval

- **WHEN** a client sends `GET /api/metrics/config/defaults`
- **THEN** the API SHALL respond with HTTP status 200
- **THEN** the response JSON payload SHALL be an array of objects
- **THEN** each object SHALL contain fields: `metric_name`, `t_minus_2`, `t_minus_1`, `t_zero`, `t_plus_1`, `t_plus_2`
- **THEN** the array SHALL contain one entry for each metric in the SEED_DATA constant

#### Scenario: Default values for terminal_price_ratio

- **WHEN** the client retrieves defaults and looks for `terminal_price_ratio`
- **THEN** the matching object SHALL contain:
```json
{
  "metric_name": "terminal_price_ratio",
  "t_minus_2": 0.17,
  "t_minus_1": 0.25,
  "t_zero": null,
  "t_plus_1": 0.75,
  "t_plus_2": 1
}
```

#### Scenario: Defaults are independent of user modifications

- **WHEN** the user has modified thresholds for `mvrv_z` in the database
- **THEN** `GET /api/metrics/config/defaults` SHALL still return the original seed values for `mvrv_z` (t_plus_2: 0.15, t_plus_1: 0.17, t_minus_1: 4.6, t_minus_2: 6.65)
