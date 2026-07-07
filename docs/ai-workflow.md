# AI Workflow

How AI tooling was used to build this system, and the conventions that kept
it honest.

## Tooling

- **Claude Code** (agentic CLI) as the primary development environment.
- A **"superpowers" skill set** that enforces a disciplined workflow:
  brainstorming → design spec → implementation plan → execution, with a
  review gate at each transition.
- A **stronger advisor model** consulted at decision points (before
  committing to the architecture, before writing code) to pressure-test the
  approach.

## Workflow

1. **Brainstorming.** The problem was framed from the HR-Manager persona
   before any code: goal, scope, and — importantly — what to deliberately
   leave out (see `requirements.md`). Approaches were compared (Postgres vs
   SQLite, Express vs Nest/Next, fixed vs live FX) before settling.
2. **Design spec.** A full technical design was written, self-reviewed for
   gaps/contradictions, and approved before planning. It fixes the data
   model, API surface, testing seam, and file structure.
3. **Implementation plan.** A task-by-task plan was derived from the spec —
   each task an independently testable deliverable following TDD (write the
   failing test, implement, watch it pass) with a commit at the end.
4. **Execution.** Tasks are executed phase by phase (scaffolding → data &
   seed → auth → employees → analytics → frontend → deploy), with a human
   review checkpoint at each phase boundary.

## Conventions

- **Correctness over acceptance.** AI-generated code is only committed after
  its tests are actually run and observed to pass — never on "it should
  work."
- **Tests are the contract.** Pure logic (currency, stats, pagination,
  validation) is unit-tested with hand-computed expected values; the SQL
  analytics are integration-tested against a small fixture whose
  medians/percentiles are calculated by hand.
- **Incremental commits.** Each commit is a milestone-sized step so the
  history shows how the solution evolved.
- **No AI co-author trailer** on commits (project convention).
- The internal design spec and implementation plan (`docs/superpowers/`)
  are kept local; their gradeable substance is captured in the committed
  artifacts (`requirements.md`, `architecture.md`, `trade-offs.md`, this
  file).

## Notable decisions during the build

- **Environment gating before design lock-in.** Before writing code, the
  runnability of Docker/Postgres was checked. Postgres was kept (over the
  suggested SQLite) only because the environment could run it; SQLite was the
  documented fallback.
- **Host port clash.** The host already ran a Postgres on 5432, so the
  container's host-side port was remapped to 5433 for local dev (services
  still use `postgres:5432` inside the compose network). Caught at first
  `docker compose up`, not at the end.
- **TDD throughout.** Pure utilities and validation schemas were written
  test-first (write failing test → implement → green). Analytics were verified
  against a hand-computed fixture whose medians/percentiles were calculated by
  hand.
- **Correctness gate.** A `tsc` build-scope bug (seed file outside `rootDir`)
  was found by running the real compiler, not just the test runner — Vitest
  uses esbuild and doesn't type-check.
- **Real-browser verification.** After the single-command deploy, the app was
  driven in an actual browser (login → dashboard → employees). This caught a
  first-paint issue the jsdom tests couldn't: Recharts' entry animation left
  bars invisible on initial render, fixed by disabling it.
- **Phase-by-phase review.** Work proceeded in reviewable phases (scaffolding →
  data/seed → auth → employees → analytics → frontend → deploy), each ending
  with tests green and a checkpoint.

_This log records the actual process, not an idealized one._
