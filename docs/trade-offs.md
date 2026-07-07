# Trade-offs & Reasoning

Each decision below records what we chose, why, and what we gave up.

| Decision | Chose | Why | Gave up |
|---|---|---|---|
| **Database** | PostgreSQL | Native `percentile_cont`, window functions, and `DISTINCT ON` let the analytics math (median/percentiles, per-employee latest salary) live in one tested SQL CTE instead of being re-implemented in TypeScript over 10k rows in memory. | Zero-setup portability. SQLite was the assessment's suggestion and our fallback if the environment couldn't run Docker; the env check passed, so Postgres stands. |
| **API framework** | Express + explicit layering | Makes architectural judgment *visible*: the `routes → controllers → services → repositories` split is a deliberate choice, not a framework default. That layering is the thing being assessed. | NestJS's built-in DI/modules and Next.js's fullstack conveniences (would do the organizing for us). |
| **Money representation** | `Decimal` end-to-end, serialized as strings | Summing salaries across 10k+ rows in JS floats accumulates rounding error; Decimal + string-over-the-wire keeps every total exact. Formatting happens once at the UI edge. | The minor convenience of doing arithmetic on plain JS numbers. |
| **FX rates** | Fixed, seeded `CurrencyRate` table | Deterministic tests and reproducible analytics; no network dependency or new failure mode. The table is the exact seam where a real deployment plugs in a refresh job. | Live, up-to-the-minute exchange rates (not needed for this exercise). |
| **Current salary** | Computed from latest `SalaryHistory` row | One source of truth; no denormalized `currentSalary` column to drift out of sync. | A slightly cheaper read (avoided at 10k scale via indexing). |
| **Delete** | Soft-delete (status → `TERMINATED`) | Matches real HR data-retention needs and keeps history/audit intact. | Hard delete (not exposed). |
| **Test isolation** | `TRUNCATE ... RESTART IDENTITY CASCADE` in `beforeEach` | Keeps repository signatures clean. Fast at fixture scale (a dozen rows). | Transaction-per-test-rollback — rejected because Prisma can't transparently join an externally-opened transaction without threading a client param through every repository function. |
| **Test split** | Pure unit tests (no DB) + a few DB-backed integration tests | The assessment asks for fast, deterministic tests. Currency/stats/pagination/validation logic is extracted into pure functions that run in milliseconds; only the SQL analytics + CRUD + auth flows need a DB. | A single uniform test style (would push everything into slow DB territory). |
| **Seed determinism** | `faker.seed(42)`, no other randomness | Same 10k dataset every run → reproducible analytics and demos, plus a deliberately *shaped* distribution so the dashboards are visibly meaningful. | Fresh random data per run. |
| **RBAC** | `role` column + `requireRole` guard, one role in use | Adding roles later is additive (enum + guard), with no speculative permission UI built now. | Full multi-role permission management (out of scope). |
| **Deployment** | Single-host `docker compose up` | One command brings up Postgres + API + web with migrate/seed — the reviewer's fastest path to a running system, and the chosen target for this submission. | Split PaaS (Railway/Render + Vercel) — more moving parts and external accounts. |
