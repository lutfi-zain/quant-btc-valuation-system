## 1. Project Initialization & Database Setup

- [x] 1.1 Scaffold directories: `/quant`, `/backend`, `/frontend`, `/database`
- [x] 1.2 Initialize SQLite database schema (`timeseries_metrics`) with `date`, `metric_name`, `raw_value`, `normalized_value`, `btc_price` columns
- [x] 1.3 Add database seed/migration script to create the schema and the composite index `(metric_name, date)`
- [x] 1.4 Write Python unit test (`pytest`) verifying the database schema creation
- [x] 1.5 Write a simple Python wrapper/class to interact with SQLite (insert and read functions)

## 2. Quant & Data Ingestion (Python)

- [x] 2.1 Set up `requirements.txt` and install Python dependencies
- [x] 2.2 Create `aviv_ratio.py` component script to fetch historical AVIV Ratio from CheckOnChain
- [x] 2.3 Implement the normalization logic for AVIV Ratio mathematically bounded/scaled between -2 and +2
- [x] 2.4 Integrate the script to insert fetched and normalized data into the SQLite database with `metric_name` as `aviv_ratio`
- [x] 2.5 Write `pytest` unit tests for data fetch, normalization logic, and DB insertion

## 3. Backend API Development (Bun & Hono)

- [x] 3.1 Initialize Bun project in `/backend` and install Hono + SQLite client
- [x] 3.2 Implement `/api/health` health check endpoint returning exactly `{"status": "ok", "version": "1.0.0"}`
- [x] 3.3 Implement `/api/metrics/aviv_ratio` endpoint querying the SQLite database without using underscore-prefixed fields
- [x] 3.4 Write Bun tests for `/api/health` and `/api/metrics/aviv_ratio` endpoints ensuring JSON structure matches specs

## 4. Frontend Development (Bun & Vite/React)

- [x] 4.1 Initialize Vite React app in `/frontend` using Bun
- [x] 4.2 Install charting library (e.g., `recharts` or `lightweight-charts`)
- [x] 4.3 Create a React component to fetch data from `/api/metrics/aviv_ratio`
- [x] 4.4 Render the AVIV Ratio dual-axis chart visualizing the Oscillator vs. BTC Price
- [x] 4.5 Write basic frontend tests (Bun test / vitest)

## 5. Verification & Completion

- [x] 5.1 Manual User Validation: Run end-to-end (ingest -> start backend -> load frontend) and visually inspect the chart
- [x] 5.2 Auto-Verification: Read all artifacts (proposal, design, specs, tasks) to ensure zero gaps
- [x] 5.3 Auto-Verification: Verify every SHALL/MUST requirement against the code
- [x] 5.4 Auto-Verification: Launch the Hono server locally and run E2E verification with `curl`
- [x] 5.5 Auto-Verification: Spawn parallel reviewer subagents to audit the implementation for correctness, conventions, and style consistency
