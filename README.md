# ACME Salary Management

Web-based salary management for ACME's HR team — replaces spreadsheet-driven
salary tracking for **10,000 employees** across multiple countries with a
searchable directory, a salary-history audit trail, and pay analytics
(distribution, percentiles, spend by country/department/level, and a
pay-equity gap) all **normalized to USD**.

Built for a single persona — the **HR Manager** — who needs to answer "how do
we pay people?" without exporting to Excel.

![Dashboard](docs/images/dashboard.png)
![Employee directory](docs/images/employees.png)

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node 24, TypeScript, Express 4 (layered: routes → controllers → services → repositories) |
| Database | PostgreSQL 16 via Prisma; analytics in raw SQL (`percentile_cont`, `DISTINCT ON`) |
| Frontend | React 18 + Vite + TypeScript, Tailwind CSS, TanStack Query/Table, Recharts, React Hook Form + Zod |
| Tests | Vitest everywhere; Supertest (API integration), React Testing Library (web) |
| Deploy | One `docker compose up` — Postgres + API + web (nginx) |

## Quick start (one command)

Requires Docker + Docker Compose.

```bash
docker compose up --build
```

This builds and starts all three services. On first boot the API applies
migrations and seeds 10,000 employees deterministically (idempotent — skips
if already populated). When it settles, open:

**http://localhost:8080**

Sign in with the seeded HR Manager:

- **Email:** `hr@acme.test`
- **Password:** `password123`

The browser talks only to nginx on `:8080`, which serves the SPA and proxies
`/api/*` to the API — single origin, no CORS.

> **Note:** the compose Postgres is published on host port **5433** (not the
> default 5432) so it doesn't clash with a Postgres already running on the
> host. Inside the compose network, services reach it at `postgres:5432`.

## Local development

```bash
# 1. Start Postgres (creates salary_dev + salary_test databases)
docker compose up -d postgres

# 2. API  →  http://localhost:4000
cd api
cp .env.example .env
npm install
npx prisma migrate deploy      # apply schema to salary_dev
npx prisma db seed             # seed 10k employees (deterministic)
npm run dev

# 3. Web  →  http://localhost:5173
cd web
cp .env.example .env
npm install
npm run dev
```

## Running tests

```bash
# API — 50 tests (unit + integration). Needs Postgres up (test DB).
cd api
npx prisma migrate deploy      # once, to create the test schema
DATABASE_URL="postgresql://salary_app:salary_app_password@localhost:5433/salary_test" \
  npx prisma migrate deploy
npm test

# Web — 18 tests (React Testing Library). No services required.
cd web
npm test
```

Unit tests (currency/stats/pagination/validation) are pure and run in
milliseconds; integration tests reset the test DB with `TRUNCATE` between
cases and assert analytics medians/percentiles against a hand-computed
fixture. See [`docs/ai-workflow.md`](docs/ai-workflow.md) for the testing
philosophy.

## Project structure

```
api/                 Express + TypeScript API
  prisma/            schema, migrations, deterministic 10k seed
  src/
    shared/          pure utilities (currency, stats, pagination) — unit tested
    middleware/      requireAuth, requireRole, errorHandler
    auth/ employees/ analytics/   self-contained verticals
                     (schemas → repository → service → controller → routes)
  tests/unit         fast, DB-free
  tests/integration  Supertest against the exported app + a test DB
web/                 React + Vite SPA
  src/api/           typed API client
  src/components/    UI primitives + feature components + charts
  src/pages/         Login, Dashboard, Employees, EmployeeDetail, EmployeeForm
  tests/             React Testing Library
docs/                requirements, architecture, trade-offs, AI-workflow, demo
```

## Documentation

- [`docs/requirements.md`](docs/requirements.md) — one-page requirements (goal, scope, deliberate exclusions)
- [`docs/architecture.md`](docs/architecture.md) — architecture, data model, the money invariant, analytics core
- [`docs/trade-offs.md`](docs/trade-offs.md) — key decisions and what was given up
- [`docs/ai-workflow.md`](docs/ai-workflow.md) — how AI tooling was used
- [`docs/demo-script.md`](docs/demo-script.md) — demo walkthrough / video storyboard
