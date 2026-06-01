# AGENTS.md

**Repository:** `quant-btc-valuation-system`
**Domain:** Quantitative and statistical Bitcoin cycle valuation system aggregating onchain metrics, sentiment, and technical indicators.

This file is the authoritative guide for AI coding agents working in this repository. It defines the layered architecture, code style rules, testing requirements, and hard constraints that every change must satisfy.

> [!IMPORTANT]
> **Primary System Context:**
> AI agents MUST always read the [config.yaml](file:///run/media/lutfizain/Work/Projects/1.WORKING/quant-btc-valuation-system/openspec/config.yaml) file before proceeding with any design, tasks, or coding. It contains the exact tech stack details, development conventions, python/pydantic serialization guidelines, and specific rules for proposals, specs, design, and implementation tasks.

---

## Commands

```bash
# Run Python automated tests with coverage
python -m pytest --cov

# Run JS/TS automated tests
bun test
```

Run all tests and confirm they pass before finalising any change.

---

## Project Context & Business Domain (DDD)

**System Output:** The ultimate output of this system is a **valuation oscillator ranging from -2 (low value / bottom) to +2 (high value / peak)**.

**System Architecture & Data Workflow Rules:**
1. **Raw Data Ingestion:** Raw data is fetched online and stored natively in SQLite (creating new tables as needed). Every metric must have a callable function to either fetch fresh delta data or rebuild from 0.
2. **Component Modeling:** A single raw data metric acts as a system "component." The system applies statistical workflows to manipulate it (e.g., normalizing it into the -2 to +2 scale or building statistical models around it).
3. **One Component = One Python Script:** Each component must be built as an isolated Python script. This script serves as a "playground" to easily visualize the data and tweak parameters (e.g., lengths, moving averages).
4. **Agent Knowledge Prerequisite:** Before writing code or specs for any specific metric (e.g., AVIV Ratio, Puell Multiple), AI agents MUST actively research and learn its exact mathematical formula, statistical definition, and cycle implications to prevent implementation hallucinations.

**Ubiquitous Language:**
- **ValuationOscillator:** The final -2 to +2 bounded score indicating cycle positioning.
- **ValuationMetric:** Any quantitative variable used to estimate Bitcoin's cycle positioning.
- **ComponentScript:** A standalone Python script acting as a parameter playground for a specific metric.
- **OnChainMetric:** Data derived from blockchain transactions (e.g., Realized Price, MVRV Z-Score, Puell Multiple).
- **SentimentIndicator:** Data capturing market psychology (e.g., Fear & Greed Index, funding rates).
- **TechnicalIndicator:** Price-action calculations (e.g., moving average crossovers, RSI).
- **BTCValuationModel:** Statistical models that aggregate metrics to output cycle phases (e.g., Peaks, Troughs).

Ensure all variable names, database columns, and API responses strictly adhere to this ubiquitous language.

---

## Architecture Boundaries (Progressive Disclosure)

Logic flows strictly according to the defined architectural patterns in [config.yaml](file:///run/media/lutfizain/Work/Projects/1.WORKING/quant-btc-valuation-system/openspec/config.yaml).

For the canonical implementation patterns, refer to:
*The repository is currently being bootstrapped. No "Gold Standard" implementation files exist yet. Follow the directory structure and pattern instructions specified in the [config.yaml](file:///run/media/lutfizain/Work/Projects/1.WORKING/quant-btc-valuation-system/openspec/config.yaml) when introducing new directories or files.*

*Agents: Do not hallucinate structural patterns. Read the config file before creating new components.*

---

## Security & Compliance Guardrails

- **Never assume API keys exist:** Always ask the user or load them gracefully via secure environment variables.
- **Do not expose raw SQLite database endpoints directly** to the public web.
- **No private fields (underscore-prefixed like `_field`) in Pydantic response models** as Pydantic v2 excludes them from serialization.

---

## Git & Workflow Conventions

- **Git Rules:** Never force push (`git push --force` or `--force-with-lease`). Always run `git pull --rebase` first, resolve conflicts, and push normally.
- **Commit Format:** Use Conventional Commits for all commit messages.
- **Branching Strategy:** Use `feature/<name>` for new feature branches.

---

## Dependencies & Environment

- **Node runtime/JS/TS package manager:** Always use `bun` (install, run, build, deploy).
- **Python package manager:** Use `pip` (instead of `pip3`) for Python dependencies.

---

## Historical Session Learnings (Dynamic Log)

*When you consistently fail at a specific architectural nuance or encounter a repeating edge-case, add a note here to prevent future agents from making the same mistake.*

- **[2026-06-02]** Daily vs Weekly Metric Alignment & Future Composite Gaps — Daily metric timelines must start on 2009-01-01, while weekly series start on 2009-01-03 (Saturdays). To avoid future weekly gaps when daily data is not yet available, constrain `/api/composite` query bounds to `MAX(date)` of `btc_ohlc`. [Evidence: timeline shift offset correction, backend/index.ts:230]
- **Initial Setup:** The codebase is initialized under a spec-driven flow via OpenSpec. Refer to local workflows under `.agent/workflows/` for applying changes.

