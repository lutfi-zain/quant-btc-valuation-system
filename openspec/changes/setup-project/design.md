## Context

We are establishing the foundational architecture for the BTC Cycle Valuation System. The system evaluates Bitcoin's market cycle by aggregating on-chain, sentiment, and technical metrics into a master valuation oscillator bounded between -2 and +2. The initial capability to be implemented is the AVIV Ratio Z-Score, a robust on-chain metric based on cointime economics.

## Goals / Non-Goals

**Goals:**
- Initialize a clear, modular monorepo structure with `/quant`, `/backend`, `/frontend`, and `/database` directories.
- Implement the AVIV Ratio Z-Score calculation in an isolated Python script, scraping data from CheckOnChain and normalizing the oscillator score.
- Design a performant SQLite schema optimized for timeseries reads.
- Develop a Hono API backend running on Bun to query SQLite and serve data.
- Build a React frontend dashboard with Vite using a charting library to visualize the oscillator and Bitcoin price.

**Non-Goals:**
- Real-time/streaming data updates (daily or periodic batch updates are sufficient for now).
- User authentication and multi-user environments.

## Decisions

- **Runtime & Tooling:** We will use Bun for both the backend (Hono) and frontend (Vite/React) to minimize dependency bloat and maximize execution speed. Python will handle all data fetching and statistical manipulations.
- **SQL Schema & Indexing:** Data will be stored in a flat timeseries structure. 
  - Table: `timeseries_metrics`
  - Columns: `date` (TEXT ISO8601), `metric_name` (TEXT), `raw_value` (REAL), `normalized_value` (REAL), `btc_price` (REAL).
  - Indexing: A composite index on `(metric_name, date)` will be created to ensure extremely fast range queries by the Hono backend.
- **Data Flow & Caching:** Python scripts will run as offline/batch jobs to populate the SQLite database. The Hono backend will serve as a read-only layer for the frontend. Hono can implement simple in-memory caching if read volume increases.
- **Frontend Charting:** We will use `recharts` or `lightweight-charts` (TradingView) for rendering timeseries graphs, as they handle large datasets and dual-axis (Price vs. Oscillator) charting effectively. State will be managed simply via React hooks (`useState`/`useEffect`) and `fetch`.

## Risks / Trade-offs

- **[Risk] SQLite Concurrency Issues:** The Python data pipeline might lock the database during updates, causing API timeouts on the Hono backend.
  - **Mitigation:** Enable WAL (Write-Ahead Logging) mode in SQLite, which allows concurrent reads and writes.
- **[Risk] Scraping Instability:** CheckOnChain data structure may change, breaking the Python ingestion script.
  - **Mitigation:** The Python script will be isolated. We will implement robust error handling and allow the script to easily rebuild data from scratch (from 0) if historical recalculation is needed.
