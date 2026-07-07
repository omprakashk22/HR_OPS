# Demo Script / Video Storyboard

A ~3-minute walkthrough of the deployed app. Start with the stack running
(`docker compose up --build`) and the browser at **http://localhost:8080**.

## 0. Setup (say this up front)

> "This is ACME Salary Management — salary data for 10,000 employees across 8
> countries. The whole stack runs from one `docker compose up`: Postgres, a
> TypeScript/Express API, and a React SPA behind nginx. Let me sign in as the
> HR Manager."

## 1. Login (~15s)

- Show the login page. Enter `hr@acme.test` / `password123`, sign in.
- Note: "All data is behind JWT auth; the SPA and API share one origin via an
  nginx proxy, so there's no CORS surface."

## 2. Dashboard — "how do we pay people?" (~45s)

- **KPI tiles:** headcount 10,000, total payroll ≈ $932M, median ≈ $78.8k
  (with p25/p75). "Every figure is normalized to USD from 8 local currencies."
- **Median by dimension:** switch the selector Country → Department → Level.
  "The US median is ~$105k, India ~$37k — that's real cost-of-labor shape, not
  flat demo data."
- **Salary distribution histogram:** "A realistic right-skewed spread peaking
  in the $60–80k band."
- **Gender pay gap card:** "A ~5% median gap, male vs. female — deliberately
  seeded to be realistic, not alarmist. This is the pay-equity question HR
  actually gets asked."

## 3. Employee directory (~40s)

- Click **Employees**. "Server-side pagination — the grid never loads more
  than one page of 10,000."
- **Search** a name; **filter** by country (e.g. IN) and level; **sort** by a
  column. "All filtering/sorting/pagination happens in Postgres."
- Point out the **Current (USD)** column: "Each row's local salary normalized
  to USD for comparison."

## 4. Employee detail + salary history (~30s)

- Click a row. Show the **profile** and **current compensation**.
- Show the **salary-history timeline** — "an append-only audit trail; the
  current salary is always the latest effective-dated row, never a duplicated
  field."

## 5. Record a salary change (~30s)

- Click **Adjust salary**. Try submitting empty → validation fires.
- Enter a new base + effective date + reason (e.g. "Annual raise"), save.
- "The new entry appears at the top of the timeline and the current
  compensation updates immediately."

## 6. Create an employee (~20s, optional)

- **Add employee** → fill the form (profile + initial salary) → create.
- "Employee number is auto-assigned; the initial salary is written as the
  first 'Initial hire' history row in one transaction."

## 7. Close (~15s)

> "Under the hood: money is a decimal end-to-end and only formatted at the UI
> edge, so aggregates over 10k rows stay exact. Analytics run on one shared
> SQL CTE that's unit-tested against hand-computed medians. 68 tests total,
> all green. Thanks for watching."

## Suggested recording order for screenshots/GIFs

Login → Dashboard (with the dimension selector toggled) → Employees (search +
filter) → Employee detail → Adjust-salary dialog → back to detail showing the
new row.
