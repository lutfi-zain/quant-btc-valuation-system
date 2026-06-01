## Context

The BTC Cycle Valuation System requires a cross-stack setup: Python for quant calculations, SQLite for storage, Hono (Bun) for the backend API, and Vite + React (Bun) for the frontend. The very first component being implemented is the AVIV Ratio Z-Score, a fundamental indicator representing the ratio of active cap to investor cap based on the True Market Mean (TMM). 

## Goals / Non-Goals

**Goals:**
- Define the directory and dependency structure for the four core domains (`/quant`, `/database`, `/backend`, `/frontend`).
- Detail the SQLite schema and indexing strategy for time-series data.
- Detail how the Hono backend retrieves metrics from SQLite.
- Detail the frontend component design using Recharts to visualize the Z-Score levels (-2 to +2).

**Non-Goals:**
- Implement any other metrics beyond AVIV Ratio Z-Score.
- Complex authentication or rate limiting for the internal Hono API.

## Decisions

### 1. Database Schema & Indexing (SQLite)
We will use SQLite to store the time-series data. The schema will have a table specifically for `aviv_ratio_zscore`.
- **Table:** `aviv_ratio_zscore`
- **Columns:** `date` (TEXT, primary key, YYYY-MM-DD format), `value` (REAL)
- **Indexing:** The `date` column will be the primary key, naturally providing an index for fast time-based queries.

### 2. Python Quant Module
- The Python script `quant/components/aviv_ratio_zscore.py` will serve as the "playground" and calculator.
- It will have a function `fetch_and_calculate(rebuild=False)` to fetch data and write to the SQLite database.
- We will use `requests` to fetch data and `sqlite3` to insert it.

### 3. Backend (Hono + Bun)
- The backend will expose a single endpoint: `GET /api/metrics/aviv-ratio-zscore`
- It will query SQLite using the built-in `bun:sqlite` for high performance.
- Responses will be JSON arrays of `{ date: string, value: number }`.

### 4. Frontend (Vite + React)
- We will use Recharts for rendering the time-series line chart because it is React-native, performant, and easy to customize for Z-score bounds.
- State management will be standard React hooks (`useState`, `useEffect`).
- The UI will explicitly mark the -2, -1, 1, 2 standard deviation levels.

## Risks / Trade-offs

- **[Risk] SQLite concurrency issues during data fetching** → Mitigation: Enable WAL (Write-Ahead Logging) mode in SQLite to allow concurrent reads from Hono while Python writes updates.
- **[Risk] Data source API changes** → Mitigation: Keep parsing logic isolated in `aviv_ratio_zscore.py`, allowing fast iteration if the external data structure changes.
