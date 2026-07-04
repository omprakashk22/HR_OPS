# Design: ACME Salary Management Software

**Date:** 2026-07-04
**Status:** Approved
**Author:** Omprakash (with Claude Code)

## 1. Context

ACME's HR team manages salary data for 10,000 employees across multiple
countries in spreadsheets. This is tedious and makes it hard to answer basic
questions about how the org pays people (distribution, gaps, spend by
country/department). This document is the technical design for the
replacement: a web-based salary management system for a single persona,
the **HR Manager**.

This design follows from the brainstorming session recorded in the
conversation; the companion one-page requirements document (goal, scope,
explicit exclusions) is a separate, first-class artifact — see
`docs/requirements.md` — and is the first commit in this repository.

## 2. Goals

- Let the HR Manager manage (create/view/edit/delete) salary records for
  10,000 employees through a web UI, instead of Excel.
- Let the HR Manager answer "how do we pay people" questions: distribution,
  percentiles, spend by dimension, and pay-equity gaps — normalized across
  currencies.
- Demonstrate production-quality engineering: clean layering, a meaningful
  and fast test suite, and a reproducible deterministic seed of 10k
  employees.

## 3. Non-goals (deliberately out of scope)

See `docs/requirements.md` for the full reasoning. Summary: payroll
processing/disbursement, tax & benefits administration, approval workflows,
employee self-service, real-time FX rates, multi-tenancy, notifications/
email, and full RBAC (more than one role in use).

## 4. Architecture overview

Two deployables, communicating over a versioned JSON REST API:

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────────┐
│  React SPA (Vite)   │ ───────────────────────▶ │  Express API (TS)        │
│  Tailwind + shadcn   │ ◀─────────────────────── │  routes/controllers/     │
│  TanStack Query/Table│                          │  services/repositories   │
└─────────────────────┘                          └────────────┬─────────────┘
                                                                │ Prisma Client
                                                                ▼
                                                       ┌──────────────────┐
                                                       │   PostgreSQL     │
                                                       │  (docker-compose)│
                                                       └──────────────────┘
```

Both services run via a single `docker-compose up` for local/dev, with
separate Dockerfiles so each can also be deployed independently (API on
Render/Railway, frontend as a static build on Vercel/Netlify, or both on
Railway). Deployment target is finalized at the deployment step (see §11)
but the containerization decision is locked now so that step is a formality,
not a redesign.

### 4.1 Backend layering

```
routes/         → HTTP method + path → controller (thin, no logic)
controllers/    → parse/validate request (Zod), call service, shape response
services/       → business logic: pure where possible, orchestration
                  otherwise. This is where the testing seam lives (§7).
repositories/   → Prisma queries + raw SQL for aggregation. Only layer that
                  imports PrismaClient.
```

Rule: controllers never touch Prisma directly; services never touch
`req`/`res`. This keeps services unit-testable without an HTTP layer, and
repositories swappable/mockable without touching business logic.

### 4.2 Why Express (not Nest/Next)

Chosen by the candidate: Express + TS SPA gives the most surface to
demonstrate architectural judgment explicitly (no framework DI/module magic
doing the organizing for us) — the layering above is a deliberate choice,
not a framework default, which is the point being assessed.

## 5. Data model

All money fields are `NUMERIC(14,2)` in Postgres, `Prisma.Decimal` in code.
**Money is never coerced to a JS `number`** anywhere in the backend; it is
serialized as a **string** over the API and formatted to a display currency
only at the UI edge (a single `formatMoney` utility). This avoids float
rounding errors on aggregate sums over 10k+ rows.

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(HR_MANAGER)
  createdAt    DateTime @default(now())
}

enum Role {
  HR_MANAGER
}

model Employee {
  id             String   @id @default(uuid())
  employeeNumber String   @unique
  firstName      String
  lastName       String
  gender         Gender
  country        String   // ISO 3166-1 alpha-2
  department     String
  jobTitle       String
  level          Level
  localCurrency  String   // ISO 4217, e.g. "USD", "INR"
  hireDate       DateTime
  status         EmployeeStatus @default(ACTIVE)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  salaryHistory  SalaryHistory[]

  @@index([country])
  @@index([department])
  @@index([level])
  @@index([status])
}

enum Gender {
  FEMALE
  MALE
  OTHER
  UNDISCLOSED
}

enum Level {
  L1_JUNIOR
  L2_MID
  L3_SENIOR
  L4_STAFF
  L5_PRINCIPAL
  L6_MANAGER
}

enum EmployeeStatus {
  ACTIVE
  TERMINATED
}

model SalaryHistory {
  id           String   @id @default(uuid())
  employeeId   String
  employee     Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  baseSalary   Decimal  @db.Decimal(14, 2)
  bonus        Decimal  @db.Decimal(14, 2) @default(0)
  currency     String   // ISO 4217, matches employee.localCurrency at time of entry
  effectiveDate DateTime
  reason       String   // e.g. "Initial hire", "Annual raise", "Promotion", "Market adjustment"
  changedBy    String   // User.id of the HR manager who made the change
  createdAt    DateTime @default(now())

  @@index([employeeId, effectiveDate])
}

model CurrencyRate {
  code        String   @id // ISO 4217, e.g. "INR"
  rateToUsd   Decimal  @db.Decimal(18, 8) // 1 unit of `code` = rateToUsd USD
  updatedAt   DateTime @updatedAt
}
```

**Current salary** for an employee = the `SalaryHistory` row with the latest
`effectiveDate` (ties broken by `createdAt`). This is computed, never
duplicated onto `Employee`, so there is exactly one source of truth and no
sync-drift risk.

## 6. API surface

All endpoints (except `/auth/login`) require `Authorization: Bearer <jwt>`.
Base path: `/api/v1`.

### Auth
- `POST /auth/login` — `{ email, password }` → `{ token, user }`
- `GET /auth/me` — current user from JWT

### Employees
- `GET /employees` — paginated list. Query params: `page`, `pageSize`,
  `search` (name/employee number), `country`, `department`, `level`,
  `status`, `sortBy`, `sortDir`. Returns current salary (USD-normalized)
  alongside each row for grid display.
- `GET /employees/:id` — full record + salary history, oldest→newest
- `POST /employees` — create employee + initial salary row (reason:
  "Initial hire")
- `PATCH /employees/:id` — update non-salary fields
- `DELETE /employees/:id` — soft-delete (status → `TERMINATED`); hard delete
  is not exposed, matching real HR data-retention needs
- `POST /employees/:id/salary` — `{ baseSalary, bonus, currency,
  effectiveDate, reason }` → appends a new `SalaryHistory` row

### Analytics (all normalize to USD via `CurrencyRate`)

All four endpoints below read from one shared building block: a
`latest_salary_usd` SQL CTE (`DISTINCT ON (employee_id) ... ORDER BY
effective_date DESC`, joined to `CurrencyRate`, projecting
`(base_salary + bonus) * rate_to_usd AS annual_usd` per active employee).
This CTE is defined once in the analytics repository and reused by every
query below — the analytical core is built and tested once, not
re-derived per endpoint.

**Total payroll (USD)** is defined as the sum of `annual_usd` across all
active employees' latest salary rows (base + bonus, annualized — not
summed across history, since the CTE selects exactly one row per
employee).

- `GET /analytics/summary` — headcount, total payroll (USD, as defined
  above), overall median/p25/p75/min/max of `annual_usd`
- `GET /analytics/distribution?groupBy=country|department|level` —
  per-group headcount, median/p25/p75, total payroll, grouped from the
  same CTE
- `GET /analytics/histogram?bucketSize=10000` — salary-band buckets +
  counts over `annual_usd`, for a histogram chart
- `GET /analytics/equity?dimension=gender&within=level` — median
  `annual_usd` by `dimension` value, computed within each value of
  `within` (e.g. gender gap, controlled for level), plus a headline gap %

## 7. Testing strategy — the pure/SQL seam

The assessment asks for tests that are "fast, deterministic, and easy to
understand." Postgres was chosen specifically for its aggregate SQL
(`percentile_cont`, window functions), which means the interesting
analytics math lives in SQL, not TS. Left unaddressed, that would push all
tests into slow, DB-dependent integration territory. The design resolves
this with an explicit split:

**Unit tests (Vitest, no database, milliseconds each)** — cover pure
functions extracted into `services/`:
- `computeGapPercent(medianA, medianB)`
- `bucketSalary(amount, bucketSize)` (histogram bucketing)
- `normalizeToUsd(amount, currency, rates)` (currency math, Decimal-safe) —
  this covers **per-row display normalization only** (e.g. showing a
  single employee's current salary in USD on the list/detail views). It
  does **not** cover the analytics aggregation path — see below.
- `parseListQuery(query)` → typed `{ page, pageSize, filters, sort }`
  (pagination/filter/sort parsing, including invalid-input handling)
- Zod schemas for employee/salary payloads (valid + invalid cases)

These are the bulk of the "unit tests" the assessment asks for, and they
require no setup/teardown, so they run in CI in well under a second.

**Integration tests (Vitest + Supertest, seeded test DB, truncate-between-tests)**
— cover what can't be meaningfully tested without Postgres:
- The `latest_salary_usd` CTE and all four analytics queries built on it
  (percentiles, group-bys, the currency-rate join/normalization itself) —
  asserted against a small, known, hand-seeded fixture (e.g. 12 employees
  with known salaries across 2–3 currencies) where the expected
  median/p25/p75/total-payroll can be computed by hand and asserted
  exactly. This is where analytics currency normalization is actually
  verified — it is a SQL-level concern, not the pure `normalizeToUsd`
  function above.
- Auth flow (login success/failure, JWT rejection)
- Employee CRUD + salary-adjustment endpoints, including validation errors
  and 404s

Each integration test file resets state via a `resetDb()` helper
(`TRUNCATE ... RESTART IDENTITY CASCADE` on all tables) called in
`beforeEach`, then inserts only the small fixture that test needs.
Transaction-per-test-with-rollback was considered but rejected: Prisma
Client has no way to make an arbitrary `prisma.employee.findMany()` call
transparently join a transaction opened outside it, so that pattern would
require threading a `PrismaClient | Prisma.TransactionClient` parameter
through every repository function purely to support tests — added
interface complexity not justified for a fixture this small. Truncate is
simpler, keeps repository signatures clean, and is still fast (a dozen
rows). A single test-DB container (started once for the whole suite via
docker-compose) is enough; no per-test container startup.

**Frontend tests (Vitest + React Testing Library)** — a focused set on the
components with real logic: the analytics dashboard renders correct
numbers given mock API data, the employee grid filter/search updates query
params correctly, the salary-adjustment form validates and submits.

**Explicitly not covered by automated tests:** visual layout/styling,
exhaustive combinations of the 10k-row seed data (the seed's *shape* is
validated once, manually, via the analytics endpoints during development —
see §8), and the currency-rate values themselves (they are static seed
data, not logic).

## 8. Seed data

A `prisma/seed.ts` script generates 10,000 employees deterministically
(`faker.seed(42)`) and inserts via `createMany` in batches of 1,000 for
speed. Distribution is deliberately shaped so the analytics screens are
*visibly* meaningful rather than flat:

- **8 countries** (US, IN, GB, DE, CA, AU, SG, BR) with different pay bands
  and currencies (USD, INR, GBP, EUR, CAD, AUD, SGD, BRL), each with a
  seeded `CurrencyRate`.
- **6 levels** (L1–L6) with increasing, overlapping-but-distinct salary
  bands per level, so percentile spread is visible within and across
  levels.
- **~8 departments** (Engineering, Sales, Marketing, Finance, HR,
  Operations, Product, Support) with different average comp by department.
- **Gender** distributed ~48/48/2/2 (female/male/other/undisclosed), with a
  deliberate, small, realistic base-salary skew (e.g. -4% to -6% median at
  the same level) baked into the generator — enough for the equity-gap
  screen to show a non-zero, non-alarmist gap, matching real aggregate
  compensation-survey data rather than an exaggerated demo number.
- 1–3 `SalaryHistory` rows per employee (initial hire, sometimes a raise or
  promotion), so the history/audit views aren't empty on every record.

After seeding, the design is validated by manually hitting
`/analytics/distribution` and `/analytics/equity` and confirming the
numbers are non-flat and plausible before building the frontend against
them — this check is a documented step in the implementation plan, not an
automated test (per §7, seed *shape* is a one-time manual sanity check).

## 9. Frontend

- **Vite + React + TypeScript**, **Tailwind CSS + shadcn/ui** for
  components (accessible, unstyled-by-default primitives — avoids the
  "obviously templated" look of a heavier kit like MUI/AntD out of the box).
- **TanStack Query** for all server state (caching, refetch, loading/error
  states) — no hand-rolled fetch/useEffect data flow.
- **TanStack Table** for the 10k-employee grid, with server-side
  pagination/sort/filter (the API does the heavy lifting; the table never
  holds more than one page in memory).
- **Recharts** for the dashboard (bar charts for distribution/comp-by-
  dimension, histogram for salary bands).
- **React Hook Form + Zod** for the create/edit/salary-adjustment forms,
  sharing validation schemas with the backend where practical (a `shared/`
  package or duplicated-but-identical schema, decided in the implementation
  plan).

### Pages
1. **Login**
2. **Dashboard** — KPI tiles (headcount, total payroll USD, median salary),
   payroll-by-country chart, salary histogram, comp-by-department chart,
   equity-gap summary
3. **Employees** — searchable/filterable/sortable paginated grid
4. **Employee detail** — profile + full salary history timeline + "Adjust
   Salary" action
5. **Create / Edit employee** — forms

## 10. Security & auth

- Passwords hashed with `bcrypt`.
- JWT (short-lived, e.g. 8h) signed with a server-side secret from env var,
  sent as `Authorization: Bearer`.
- A `requireAuth` Express middleware validates the JWT on all `/api/v1/*`
  routes except `/auth/login`; it attaches `req.user`.
- A `requireRole(Role.HR_MANAGER)` guard exists and is applied to all
  mutating routes, even though only one role currently exists — this makes
  the system RBAC-ready (new roles are additive: add to the enum, apply the
  guard where needed) without building unused role UI/permissions now.
- No secrets committed; `.env.example` documents required vars.

## 11. Deployment (explicit, not deferred indefinitely)

Locked now so it cannot silently drop at the end:

1. `docker-compose.yml` at repo root: `postgres`, `api`, `web` services —
   `docker compose up` is a complete one-command local run, used both for
   development and as the reviewer's fastest path to running the software.
2. Each service also has a standalone `Dockerfile` so it can deploy
   independently.
3. Final implementation-plan step: deploy `api` + `postgres` to
   Railway/Render (free tier) and `web` as a static build to
   Vercel/Netlify, wire the deployed frontend to the deployed API via env
   var, and smoke-test the live URL.
4. Record a short screen-capture video demoing: login → dashboard →
   employee search/filter → salary adjustment → history → the equity/
   distribution analytics — narrated briefly.

## 12. Artifacts to commit

- `docs/requirements.md` — one-page requirements doc (committed before any
  implementation code, immediately after this design doc)
- `docs/superpowers/specs/2026-07-04-salary-management-design.md` — this
  document
- `docs/architecture.md` — a short architecture diagram + narrative (can
  reuse §4 of this doc, kept in sync)
- `docs/ai-workflow.md` — log of AI tools/prompts used and how, per the
  assessment's explicit ask
- `docs/trade-offs.md` — condensed trade-off summary (Postgres vs SQLite,
  Express vs Nest, fixed vs live FX, etc. — pulled from this doc and the
  brainstorming transcript)
- `README.md` — setup, run, test, seed, deploy instructions

## 13. Commit conventions

Incremental, milestone-sized commits showing the solution evolve (schema →
seed → backend layer by layer → tests alongside each layer → frontend page
by page → deployment). Commits do **not** include an AI co-author trailer.

## 14. Explicitly out of scope (see `docs/requirements.md` for full reasoning)

Payroll processing/disbursement, tax & benefits administration, approval
workflows, employee self-service portal, real-time FX rate fetching,
multi-tenancy, notifications/email, full multi-role RBAC.
