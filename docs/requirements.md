# ACME Salary Management — Requirements

## Goal

Replace ACME's spreadsheet-based salary management with a web application
that lets the HR Manager maintain accurate salary records for 10,000
employees across multiple countries, and answer questions about how the
organization pays its people.

## User

HR Manager (single persona, single role, for this version).

## In Scope

- **Employee directory**: search, filter (country / department / level /
  status), sort, and paginate across 10,000 records.
- **Salary management**: view current salary, view full salary history,
  record a new salary change with a reason (raise, promotion, market
  adjustment, initial hire).
- **Employee lifecycle**: create a new employee (with an initial salary),
  edit profile fields, soft-delete (mark terminated).
- **Pay analytics**, normalized to USD across currencies:
  - Org-wide summary: headcount, total payroll, median/percentile salary.
  - Breakdown by country, department, and level: headcount, median, total
    spend.
  - Salary distribution histogram.
  - Pay-equity gap view (median salary by gender, controlled for level).
- **Authentication**: the HR Manager logs in; all data is behind auth.

## Deliberately Out of Scope (and why)

- **Payroll processing/disbursement** — this is a system of record for
  salary *decisions*, not a payments/banking integration. Real disbursement
  (bank rails, pay stubs, per-country compliance) is a separate product and
  orthogonal to managing salary data and answering questions about it.
- **Tax & benefits administration** — every one of ACME's countries has
  different tax/benefit rules. Modeling this accurately requires
  country-specific compliance expertise this assessment doesn't call for,
  and it doesn't change the core salary-data/analytics problem.
- **Approval workflows** (e.g. manager sign-off before a raise takes
  effect) — valuable in a real org, but introduces a second persona (the
  approver) and a state machine the stated single-persona problem doesn't
  require. `SalaryHistory.reason` and `changedBy` already capture what an
  approval log would need, so this is a clean v2 extension point, not a
  dead end.
- **Employee self-service** (employees viewing their own pay) — a
  different persona with a different permission model; not asked for.
- **Real-time FX rates** — a live-rate integration adds a network
  dependency, non-determinism, and a new failure mode, with no analytical
  benefit for this exercise. Fixed, seeded rates keep results deterministic
  and tests fast, which this assessment explicitly asks for. The
  `CurrencyRate` table is the seam where a real deployment would plug in a
  periodic refresh job.
- **Multi-tenancy** — this is one organization's data; nothing requires
  multiple orgs to share the system.
- **Notifications/email** — no in-scope workflow currently needs to notify
  anyone.
- **Multi-role RBAC** — only one persona (HR Manager) is specified. A
  `role` column and role-guard middleware exist so adding roles later is
  additive, but building permissions for roles nobody asked for would be
  speculative.

## Success Criteria

An HR Manager can log in, find any of 10,000 employees in under a few
seconds via search/filter, see their full salary history, record a new
salary change with a reason, and — without exporting to Excel — answer
"what's our median engineer salary in India vs. the US" and "do we have a
gender pay gap at the Staff level" directly from the dashboard.
