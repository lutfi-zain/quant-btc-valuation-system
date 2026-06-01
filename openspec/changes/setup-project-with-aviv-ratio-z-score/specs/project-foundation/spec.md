## ADDED Requirements

### Requirement: Database Initialization
The system MUST initialize a SQLite database file if it does not exist and apply the initial schema.

#### Scenario: First run initialization
- **WHEN** the backend or quant module connects to the database for the first time
- **THEN** a `sqlite.db` file is created and the base tables are established.

### Requirement: Project Directory Structure
The system MUST conform to the four-tier architecture: `quant` for Python, `backend` for Hono API, `frontend` for Vite SPA, and `database` for SQLite schema.

#### Scenario: Running the frontend
- **WHEN** the user runs `bun run dev` in the `frontend` directory
- **THEN** the Vite React application starts successfully.
