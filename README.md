<div align="center">
  
  # 📈 Quant BTC Cycle Valuation System
  
  **A quantitative and statistical valuation engine designed to identify Bitcoin cycle peaks, troughs, and mid-cycle phases.**

  ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
  ![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
  ![Hono](https://img.shields.io/badge/Hono-E36002.svg?style=for-the-badge&logo=hono&logoColor=white)
  ![Vite](https://img.shields.io/badge/Vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
  ![React](https://img.shields.io/badge/React-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
  ![SQLite](https://img.shields.io/badge/SQLite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)

  <br />
</div>

## 📖 Project Description

The BTC Cycle Valuation System is a quantitative engine that aggregates metrics across on-chain data, sentiment indicators, and technical price action. Its primary purpose is to output a **master valuation oscillator** bounded from `-2` (extreme low value / undervalued) to `+2` (extreme high value / overvalued), giving users a clear view of Bitcoin's macroeconomic cycle positioning.

## 💻 Technology Stack

The project leverages a high-performance, multi-language stack:

* **Quant / Data:** `Python 3.10+` for data scraping, on-chain metric calculations, and statistical modeling.
* **Backend:** `Hono` API framework running on the `Bun` runtime.
* **Frontend:** `React` SPA built with `Vite`, running on the `Bun` runtime.
* **Database:** `SQLite` for native, local storage of time-series metrics.
* **Package Management:** `Bun` for JavaScript/TypeScript, `pip` for Python.

## 🏗 Project Architecture

The architecture is fully decoupled, isolating the heavy statistical modeling from the fast web delivery:

1. **Raw Data Ingestion:** Raw data is fetched online and stored intact in SQLite. Data sources must expose functions to fetch incremental delta data or rebuild datasets from 0.
2. **Component Modeling:** Each raw metric is a "component" manipulated via statistical workflows to normalize it onto the `-2` to `+2` scale.
3. **The "Playground" Rule:** One Component = One Python Script. Each metric has its own dedicated script for researchers to visualize data, tweak window lengths, and experiment with transformations.

## 🚀 Getting Started

### Prerequisites
* [Bun](https://bun.sh/) (latest)
* Python 3.10+
* Git

### Installation & Setup

1. **Install JavaScript/TypeScript dependencies (Frontend & Backend):**
   ```bash
   bun install
   ```
2. **Install Python dependencies (Quant Pipeline):**
   ```bash
   python -m pip install -r requirements.txt
   ```

## 📁 Project Structure

* `/quant`: Python modules for data scraping, on-chain metric calculations, and the Pytest suite.
* `/backend`: Hono-based API service serving stats/valuation results.
* `/frontend`: Vite + React SPA presenting interactive charts and dashboards.
* `/database`: SQLite schemas, migrations, and database seeders.
* `/openspec`: Project constraints, technical designs, and task specifications.

## ✨ Key Features

* **Master Oscillator:** Normalizes disparate metrics (MVRV Z-Score, Puell Multiple, Fear & Greed) into a single bounded `-2` to `+2` score.
* **Modular Data Ingestion:** Safely rebuild historical datasets from scratch or pull live incremental data.
* **Isolated Playgrounds:** Granular Python scripts for tweaking model parameters without affecting the main API.

## 🔄 Development Workflow

This repository strictly follows **Spec-Driven Development** using [OpenSpec](https://openspec.pro/):
* All features begin as proposals in `openspec/changes/<change-name>/proposal.md`.
* Specifications and architectural designs are drafted and approved *before* implementation tasks are generated.
* **Branching Strategy:** Use `feature/<name>` for new feature branches.
* **Git Rules:** `git push --force` is prohibited. Always `git pull --rebase` before pushing. Conventional Commits are mandatory.

## 📏 Coding Standards

* **Serialization Rules:** Pydantic v2 is used. Underscore-prefixed fields (e.g., `_fallback`) are strictly forbidden in API response models to prevent serialization issues.
* **API Payloads:** API responses must align exactly with the specs. Alias fields must be mapped to guarantee backward compatibility.
* **Ubiquitous Language:** Code logic must strictly use defined terminology: `ValuationOscillator`, `ValuationMetric`, `OnChainMetric`, `SentimentIndicator`, `TechnicalIndicator`, and `BTCValuationModel`.

## 🧪 Testing

Testing is mandatory for all new features.
* **Python (Fast Validation):** `python -m pytest -xvs`
* **Python (Full Coverage):** `python -m pytest --cov`
* **JS/TS (Frontend/Backend):** `bun test`

## 🤝 Contributing

Contributions must adhere to the guardrails defined in [AGENTS.md](AGENTS.md) and [openspec/config.yaml](openspec/config.yaml).
* **Auto-Verification:** Implementers must run E2E `curl` verification against the local Hono server and spawn parallel reviewer agents to verify functionality against the spec before marking tasks as complete.
* **Security:** Never hardcode API keys; ensure graceful configuration loading. Do not expose raw SQLite database endpoints directly to the public web.

## 📄 License

*License information not yet specified.*
