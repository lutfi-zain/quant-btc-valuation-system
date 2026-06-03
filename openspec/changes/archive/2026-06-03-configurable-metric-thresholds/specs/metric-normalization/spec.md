# metric-normalization Delta Specification

## Purpose
Modifies the seeding behavior of metric_config to preserve user-customized threshold values across server restarts and seeder script executions.

## MODIFIED Requirements

### Requirement: Seed Data for All 17 Metric Thresholds

The system SHALL pre-load all 17 metric threshold configurations into the `metric_config` table via a database seeder script or migration. The seeder MUST be idempotent (safe to run multiple times without duplicating data).

The seeder SHALL use `INSERT OR IGNORE` (instead of `INSERT OR REPLACE`) to ensure that existing user-customized threshold values are never overwritten. Only metrics that do not yet have a row in `metric_config` SHALL be inserted.

The backend startup seed logic in `backend/index.ts` SHALL also use `INSERT OR IGNORE` to prevent overwriting user-modified thresholds on every server restart.

The seed data SHALL contain the following exact threshold values (unchanged from the original spec):

| metric_name | t_plus_2 | t_plus_1 | t_zero | t_minus_1 | t_minus_2 |
|---|---|---|---|---|---|
| aviv_ratio_z | -2 | -1 | NULL | 1 | 2 |
| aviv_nupl | -0.6 | -0.3 | NULL | 0.3 | 0.5 |
| cvdd_ratio | 1.3 | 1.6 | NULL | NULL | NULL |
| mvrv_z | 0.15 | 0.17 | NULL | 4.6 | 6.65 |
| lth_sth_sopr_ratio | 0.73 | 0.99 | NULL | 3.2 | 6.9 |
| terminal_price_ratio | 1 | 0.75 | NULL | 0.25 | 0.17 |
| unrealized_sell_risk | NULL | NULL | NULL | 1.8 | 2.2 |
| sharpe_52w | -20 | -10 | NULL | 42 | 53 |
| pi_cycle_top_ratio | 0.35 | 0.45 | NULL | 0.7 | 0.95 |
| vpli | 45 | 50 | NULL | 70 | 80 |
| risk_metrics | 0.13 | 0.33 | NULL | 0.75 | 0.85 |
| dvrsi | 42 | 50 | NULL | 65 | 73 |
| williams_r | -80 | -70 | NULL | NULL | NULL |
| two_year_ma_ratio | 0.7 | 1 | NULL | 3 | 4.2 |
| ahr999 | 0.45 | 0.7 | NULL | 2.9 | 5.47 |
| fear_greed_og | 30 | 50 | NULL | 60 | 70 |
| fear_greed_cmc | 20 | 40 | NULL | 60 | 80 |

The seeder SHALL be runnable as:
```bash
python -m quant.seed_metric_config
```

#### Scenario: Seeding a fresh database

- **WHEN** the seeder script is executed against a database with an empty `metric_config` table
- **THEN** the table SHALL contain exactly 17 rows, one for each metric, with the threshold values specified above

#### Scenario: Seeding is idempotent and preserves user changes

- **WHEN** the user has modified thresholds for `mvrv_z` to custom values `{t_plus_2: 0.2, t_plus_1: 0.25, t_minus_1: 5.0, t_minus_2: 7.0}`
- **AND** the seeder script is executed
- **THEN** the `mvrv_z` row SHALL retain the user's custom values `{t_plus_2: 0.2, t_plus_1: 0.25, t_minus_1: 5.0, t_minus_2: 7.0}`
- **THEN** the row SHALL NOT be overwritten with the seed defaults

#### Scenario: New metric is seeded alongside existing customized metrics

- **WHEN** the `metric_config` table contains 16 rows (with some user-customized values)
- **AND** a new 17th metric is added to the SEED_DATA constant
- **AND** the seeder script is executed
- **THEN** only the new 17th metric SHALL be inserted
- **THEN** the existing 16 rows (including user-customized ones) SHALL be unchanged

#### Scenario: Backend startup does not overwrite user thresholds

- **WHEN** the user has saved custom thresholds for `terminal_price_ratio` via `POST /api/metrics/config`
- **AND** the Hono backend server is restarted
- **THEN** the `terminal_price_ratio` row in `metric_config` SHALL retain the user's custom values
- **THEN** the seed logic SHALL NOT replace the custom values with defaults
