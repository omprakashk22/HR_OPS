# ACME Salary Management

Web-based salary management for ACME's HR team — replaces spreadsheet-driven
salary tracking for 10,000 employees across multiple countries with a
searchable directory, a salary-history audit trail, and pay analytics
(distribution, percentiles, spend by country/department/level, pay-equity
gap) normalized to USD.

## Documentation

- [`docs/requirements.md`](docs/requirements.md) — one-page requirements doc
- [`docs/architecture.md`](docs/architecture.md) — architecture & data model
- [`docs/trade-offs.md`](docs/trade-offs.md) — key trade-offs & reasoning
- [`docs/ai-workflow.md`](docs/ai-workflow.md) — how AI tools were used

## Quick start

The whole stack (PostgreSQL + API + web) runs with a single command via
Docker Compose. Full run/test/deploy instructions are completed as the app
is built out (see the final documentation task in the implementation plan).

```bash
docker compose up -d postgres   # start Postgres (dev + test databases)
cd api && npm install && npm run dev     # API on http://localhost:4000
cd web && npm install && npm run dev     # Web on http://localhost:5173
```

## Running tests

```bash
cd api && npm test
cd web && npm test
```
