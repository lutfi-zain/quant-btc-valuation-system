## Why

The system requires a foundational codebase to aggregate and evaluate Bitcoin's cycle positioning. This change bootstraps the initial project setup encompassing the data ingestion layer (Python), backend API (Hono), local database (SQLite), and frontend UI (Vite + React). We are integrating the **AVIV Ratio Z-Score** as the first quantitative metric because it is an advanced, robust on-chain indicator based on cointime economics that eliminates decay from zombie/dormant coins, utilizing True Market Mean (TMM). This ensures the system starts with a highly responsive, modern mean-reversion metric capable of accurately identifying market extremes.

## What Changes

- Bootstrapping the foundational project structure with directories for backend (`/backend`), frontend (`/frontend`), quantitative analysis & scraping (`/quant`), and database (`/database`).
- Initializing the local SQLite database to store on-chain metrics.
- Creating a dedicated Python component script to fetch AVIV Ratio data (from CheckOnChain), manipulate it, and normalize it into a standard oscillator score bounded between -2 (high value) and +2 (low value).
- Developing a Hono-based backend API (using Bun) to serve the normalized AVIV Ratio data.
- Building a Vite + React frontend dashboard (using Bun) to interactively chart and visualize the AVIV Ratio Z-Score alongside price.

## Capabilities

### New Capabilities
- `project-scaffolding`: Foundational setup for Python, Bun/Hono backend, SQLite database, and Vite/React frontend, including package management and testing suites.
- `aviv-ratio-zscore`: Data pipeline, API endpoint, and UI components for fetching, normalizing, serving, and visualizing the AVIV Ratio Z-Score metric.

### Modified Capabilities
- 

## Impact

- Establishes the primary tech stack and module boundaries for the entire BTC Valuation System.
- Introduces the first complete end-to-end data workflow (Raw Data Ingestion -> SQLite -> Hono API -> React UI).
- Requires installation of Bun for JS/TS environments and `pip` for Python data tools.
