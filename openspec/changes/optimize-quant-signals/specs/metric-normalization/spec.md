## MODIFIED Requirements

### Requirement: One-Sided Metric Normalization
The system SHALL support one-sided metrics that only define thresholds for one direction (bottom-only or top-only). Missing thresholds SHALL be represented as `None` (Python) / `NULL` (SQLite/TypeScript).

For **bottom-only** metrics (only `t_plus_2` and `t_plus_1` are defined):
- When the raw value is in the bottom zone (at or beyond `t_plus_2`), normalize to `+2`
- When the raw value is between `t_plus_2` and `t_plus_1`, interpolate between `+2` and `+1`
- When the raw value is above `t_plus_1` (outside the defined bottom zone), the result SHALL be `None` (Python) / `null` (TypeScript) / `NULL` (SQLite), which excludes it from the composite average.

For **top-only** metrics (only `t_minus_1` and `t_minus_2` are defined):
- When the raw value is in the top zone (at or beyond `t_minus_2`), normalize to `-2`
- When the raw value is between `t_minus_1` and `t_minus_2`, interpolate between `-1` and `-2`
- When the raw value is below `t_minus_1` (outside the defined top zone), the result SHALL be `None` (Python) / `null` (TypeScript) / `NULL` (SQLite), which excludes it from the composite average.

#### Scenario: Bottom-only metric in the bottom zone (CVDD Ratio)
- **WHEN** `normalize(raw_value=1.1, t_plus_2=1.3, t_plus_1=1.6, t_minus_1=None, t_minus_2=None)` is called
- **THEN** the result SHALL be `+2.0` (raw value below +2SD threshold of 1.3, clamped to +2)

#### Scenario: Bottom-only metric between +2SD and +1SD (CVDD Ratio)
- **WHEN** `normalize(raw_value=1.45, t_plus_2=1.3, t_plus_1=1.6, t_minus_1=None, t_minus_2=None)` is called
- **THEN** the result SHALL be `+1.5` (midpoint between 1.3 and 1.6 maps to midpoint between +2 and +1)

#### Scenario: Bottom-only metric outside defined zone (CVDD Ratio)
- **WHEN** `normalize(raw_value=2.5, t_plus_2=1.3, t_plus_1=1.6, t_minus_1=None, t_minus_2=None)` is called
- **THEN** the result SHALL be `NaN` (or `None`/`NULL` representing exclusion)

#### Scenario: Bottom-only metric — Williams %R in the bottom zone
- **WHEN** `normalize(raw_value=-85, t_plus_2=-80, t_plus_1=-70, t_minus_1=None, t_minus_2=None)` is called
- **THEN** the result SHALL be `+2.0` (raw value below -80, clamped to +2 — extreme bottom signal)

#### Scenario: Bottom-only metric — Williams %R outside defined zone
- **WHEN** `normalize(raw_value=-30, t_plus_2=-80, t_plus_1=-70, t_minus_1=None, t_minus_2=None)` is called
- **THEN** the result SHALL be `NaN` (or `None`/`NULL` representing exclusion)

#### Scenario: Top-only metric in the top zone (Unrealized Sell Risk)
- **WHEN** `normalize(raw_value=2.5, t_plus_2=None, t_plus_1=None, t_minus_1=1.8, t_minus_2=2.2)` is called
- **THEN** the result SHALL be `-2.0` (raw value above -2SD threshold of 2.2, clamped to -2)

#### Scenario: Top-only metric between -1SD and -2SD (Unrealized Sell Risk)
- **WHEN** `normalize(raw_value=2.0, t_plus_2=None, t_plus_1=None, t_minus_1=1.8, t_minus_2=2.2)` is called
- **THEN** the result SHALL be `-1.5` (midpoint between 1.8 and 2.2 maps to midpoint between -1 and -2)

#### Scenario: Top-only metric outside defined zone (Unrealized Sell Risk)
- **WHEN** `normalize(raw_value=1.0, t_plus_2=None, t_plus_1=None, t_minus_1=1.8, t_minus_2=2.2)` is called
- **THEN** the result SHALL be `NaN` (or `None`/`NULL` representing exclusion)
