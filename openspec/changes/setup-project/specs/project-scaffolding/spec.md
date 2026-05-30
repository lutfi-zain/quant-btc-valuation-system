## ADDED Requirements

### Requirement: Database Schema Initialization
The system SHALL initialize a SQLite database configured with a primary timeseries table for storing valuation metrics.

#### Scenario: First run initialization
- **WHEN** the database migration or initialization script is executed
- **THEN** it SHALL create a `timeseries_metrics` table with the following columns: `date` (TEXT ISO8601), `metric_name` (TEXT), `raw_value` (REAL), `normalized_value` (REAL), and `btc_price` (REAL)
- **THEN** it SHALL create a composite index on `(metric_name, date)` to optimize timeseries range queries

### Requirement: Backend API Health Check
The Hono backend SHALL expose a health check endpoint to verify system status and connectivity.

#### Scenario: Health check request
- **WHEN** a client sends a GET request to `/api/health`
- **THEN** the system SHALL respond with HTTP status 200
- **THEN** the response payload SHALL be exactly `{"status": "ok", "version": "1.0.0"}`
