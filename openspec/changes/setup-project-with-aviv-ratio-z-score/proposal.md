## Why

The BTC Cycle Valuation System requires a foundational setup that bridges the data scraping, calculation, backend API, and frontend visualization layers. Currently, the project is being bootstrapped. This change establishes the initial project structure (Python for quant, Hono for backend, Vite+React for frontend, and SQLite for database) and integrates the first key metric: the AVIV Ratio Z-Score. Implementing this end-to-end pipeline early ensures the architecture is sound and provides a tangible, working starting point for adding subsequent valuation metrics.

## What Changes

- Initialize the Python `quant` module for data scraping and statistical modeling.
- Setup a SQLite database with schemas and migrations.
- Scaffold the Hono-based backend (`backend`) to serve metrics data.
- Scaffold the Vite + React SPA frontend (`frontend`) for visualizing the AVIV Ratio Z-Score.
- Implement the AVIV Ratio Z-Score as the first component script, extracting data based on the True Market Mean (TMM) framework to evaluate the active value to investor value.
- Expose an endpoint in the Hono backend to retrieve the AVIV Ratio Z-Score time-series data.
- Build a basic chart on the frontend to visualize the AVIV Ratio Z-Score bounding levels (-2 to +2).

## Capabilities

### New Capabilities
- `project-foundation`: Setup of Python, Hono, Vite/React, and SQLite structure.
- `aviv-ratio-z-score`: Implementation of the AVIV Ratio Z-Score component, including data fetching, calculation, API endpoint, and UI visualization.

### Modified Capabilities

## Impact

- **Code:** Creates initial `/quant`, `/backend`, `/frontend`, and `/database` directories.
- **APIs:** Introduces the first internal API endpoint serving AVIV Ratio Z-Score data.
- **Dependencies:** Adds `bun` dependencies for Hono and React, and `pip` dependencies for Python (e.g., requests, pandas, pydantic v2).
- **Systems:** Establishes the standard SQLite database file as the central data store.
