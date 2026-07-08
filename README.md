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

**68 tests total: 47 with no database (29 API + 18 web) + 21 API integration.**

### Unit tests — no database required (fast & deterministic)

```bash
# API: 29 pure tests (health, currency, stats, pagination, auth, validation)
cd api
cp .env.example .env      # config values only — unit tests make no DB connection
npm install
npm run test:unit

# Web: 18 React Testing Library tests
cd ../web
cp .env.example .env
npm install
npm test
```

### Integration tests — require Postgres

```bash
docker compose up -d postgres     # starts Postgres with salary_dev + salary_test
cd api                            # (.env already copied above; npm install done)
# apply the schema to the TEST database:
DATABASE_URL="postgresql://salary_app:salary_app_password@localhost:5433/salary_test" \
  npx prisma migrate deploy
npm run test:integration          # 22 tests: auth, employee CRUD, analytics

npm test                          # or run all 50 API tests together
```

Unit tests are pure and run in milliseconds. Integration tests reset the test
DB with `TRUNCATE` between cases and assert analytics medians/percentiles
against a hand-computed fixture. See [`docs/ai-workflow.md`](docs/ai-workflow.md)
for the testing philosophy.

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
