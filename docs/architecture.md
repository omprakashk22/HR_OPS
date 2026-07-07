# Architecture

## System overview

Two deployables communicating over a versioned JSON REST API, plus a
PostgreSQL database. For deployment they run together as one
`docker compose up` (single host).

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────────┐
│  React SPA (Vite)   │ ───────────────────────▶ │  Express API (TypeScript)│
│  Tailwind + shadcn   │ ◀─────────────────────── │  routes → controllers →  │
│  TanStack Query/Table│                          │  services → repositories │
└─────────────────────┘                          └────────────┬─────────────┘
                                                                │ Prisma / raw SQL
                                                                ▼
                                                       ┌──────────────────┐
                                                       │   PostgreSQL     │
                                                       └──────────────────┘
```

## Backend layering

```
routes/         HTTP method + path → controller (thin, no logic)
controllers/    parse/validate request (Zod), call service, shape response
services/       business logic; pure where possible
repositories/   Prisma queries + raw SQL for aggregation — the ONLY layer
                that imports PrismaClient
```

**Rules:** controllers never touch Prisma directly; services never touch
`req`/`res`. This keeps services unit-testable without an HTTP layer and
repositories swappable without touching business logic.

Each domain (auth / employees / analytics) is a self-contained vertical:
its own `*.schemas.ts → *.repository.ts → *.service.ts → *.controller.ts →
*.routes.ts`. Files that change together live together.

## Data model

Four tables: `User` (HR manager, with `role`), `Employee` (profile +
country/currency/level/department/status), `SalaryHistory` (append-only
salary changes with `reason` and `changedBy` — the audit trail), and
`CurrencyRate` (ISO-4217 → USD, seeded/static).

**Current salary** for an employee is the `SalaryHistory` row with the
latest `effectiveDate` (ties broken by `createdAt`) — computed, never
duplicated onto `Employee`, so there is exactly one source of truth.

### The money invariant

All money is `NUMERIC(14,2)` in Postgres / `Prisma.Decimal` in code. **Money
is never coerced to a JS `number`.** It is serialized as a **string** over
the API and formatted to a display currency only at the UI edge (a single
`formatMoney` utility). This avoids float rounding errors when summing
aggregates over 10k+ rows.

## Analytics core

All four analytics endpoints read from one shared building block: a
`latest_salary_usd` SQL CTE — `DISTINCT ON (employee_id) ... ORDER BY
effective_date DESC`, joined to `CurrencyRate`, projecting
`(base_salary + bonus) * rate_to_usd AS annual_usd` per active employee.
Defined once, reused by summary, distribution, histogram, and equity —
the analytical core is built and tested once, not re-derived per endpoint.
Percentiles use Postgres `percentile_cont`.

## Data flow (example: employee list)

1. SPA calls `GET /api/v1/employees?page=2&country=IN&sortBy=lastName`.
2. `requireAuth` validates the JWT; controller runs `parseListQuery` (clamps
   page/pageSize, whitelists sort columns).
3. Service asks the repository, which runs a paginated Prisma query joined
   to each employee's latest salary; money returned as strings, current
   salary USD-normalized.
4. SPA renders one page in a TanStack Table; `formatMoney` formats at the
   edge.

## Security

- Passwords hashed with bcrypt; JWT (short-lived) via `Authorization:
  Bearer`.
- `requireAuth` guards all `/api/v1/*` routes except `POST /auth/login`;
  `requireRole(HR_MANAGER)` guards mutations (RBAC-ready without building
  unused role UI).
- No secrets committed; `.env.example` documents required vars.
