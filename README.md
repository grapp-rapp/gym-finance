# Shaar Binyamin Gym — Owner Finance App

An owner operating dashboard for the Shaar Binyamin gym rebuild. It answers, in ten seconds:
**how many members, what came in, what went out, what is in the bank, how much debt is left,
what we pay ourselves, when the debt is gone, and whether we are above or below the cash target.**

The reference Google Sheet (`reference/model.xlsx`) is the financial source of truth. This app
re-implements its formulas and is verified against it cell by cell — **116 headline outputs and
roughly 8,000 individual monthly cell comparisons, all matching.**

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server with hot reload (http://localhost:5173) |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the full spreadsheet-parity test suite |
| `npm run test:watch` | Same, in watch mode |
| `npm run typecheck` | Type-check without emitting |
| `npm run reconcile` | Print the Spreadsheet / App / Difference report and refresh `RECONCILIATION.md` |
| `npm run extract -- "path/to/model.xlsx"` | Re-read the reference workbook into the test fixtures |

Requires Node 20+ (developed on Node 24 LTS).

---

## Architecture

The financial model is a **pure, UI-free calculation layer**. No formula lives inside a React
component; no component reaches into the spreadsheet fixture. This is what makes the model
testable and the parity claim meaningful.

```
src/
  model/                     ← the entire financial model, pure functions only
    types.ts                 Every type: Assumptions, ScenarioPolicy, MonthRow, ScenarioResult
    assumptions.ts           Default inputs + the four owner-pay scenarios (all editable at runtime)
    excel.ts                 Excel semantics: ROUND half-away-from-zero, ROUNDUP, annuity payment
    membership.ts            Member ramp, capacity, Moatza displacement, blended pricing
    costs.ts                 Operating-cost and startup/build totals, VAT split
    financing.ts             Loan terms and the contractual (no-sweep) amortisation schedule
    tax.ts                   Corporate tax with loss carry-forward
    ownerPay.ts              Owner salary policy → gross, employer load, company cash cost
    cashflow.ts              THE ENGINE — 63 months in one pass; year roll-ups
    scenarios.ts             Multi-scenario runs, duplication, liquidity health
    reconcile.ts             Spreadsheet vs App vs Difference report
    __fixtures__/            Values parsed out of the workbook (never hand-edited)
    __tests__/               Parity + reconciliation tests
  state/AppState.tsx         Inputs, scenarios and actuals; localStorage persistence
  components/                Reusable UI + charts
  pages/                     One file per screen
  lib/                       ₪ formatting, hash router
scripts/extract-xlsx.mjs     Unzips the .xlsx and reads computed cell values (zero dependencies)
scripts/reconcile.mjs        Runs the reconciliation report and refreshes RECONCILIATION.md
reference/model.xlsx         The reference workbook
RECONCILIATION.md            The generated Spreadsheet / App / Difference report
```

### The one function that matters

```ts
runModel(assumptions, ownerPayPolicy) → ScenarioResult
```

Deterministic, side-effect free, ~2 ms. Everything on screen is derived from its output.

---

## Where the formulas live

| Concept | File | Reference sheet |
| --- | --- | --- |
| Member ramp to year-end targets | `membership.ts` | Monthly Base, column D |
| Moatza incremental-to-capacity rule | `membership.ts` | Monthly Base, columns E / F |
| Blended fee and price inflation | `membership.ts` | Inputs B44, Monthly Base column H |
| Operating cost VAT split | `costs.ts` | Operating Costs, rows 5–23 |
| Startup funding bridge and VAT refund | `costs.ts` | Startup & Funding, rows 15–22 |
| Loan payments, free grace, amortisation | `financing.ts` | Financing, rows 5–79 |
| Corporate tax with loss carry-forward | `tax.ts` | Owner Pay, columns M / Q / R / S |
| Owner salary policy | `ownerPay.ts` | Salary Scenarios, columns N / O / P |
| Debt sweeps, cash target, monthly cash | `cashflow.ts` | Owner Pay / Salary Scenarios, columns F–Z |

Every non-obvious formula carries a comment naming the sheet and column it came from.

---

## How to change assumptions

**In the app** — the *Inputs* screen holds every assumption in plain English, grouped and
collapsible: business and timeline, membership, pricing, Moatza, operating costs, startup and
build, loans, tax and VAT, cash target and debt sweeps, and owner pay. The *Operating Costs*
screen edits each cost line individually. The *Scenario Lab* edits owner-pay policies. Changes
save to `localStorage` and recalculate immediately; **Reset to spreadsheet defaults** restores the
original workbook values.

**In code** — edit `src/model/assumptions.ts`. Nothing is hardcoded inside the calculation layer;
these are only the defaults.

> Changing inputs deliberately breaks parity with the spreadsheet. That is expected — the
> *Reconciliation* screen has a **Your current inputs** toggle that shows exactly how far your
> edits have moved each number away from the original plan.

---

## How spreadsheet parity was validated

Three deliberate steps, in this order:

**1. The workbook is parsed, never transcribed.** `scripts/extract-xlsx.mjs` treats the `.xlsx` as
what it is — a ZIP of XML — and reads the *computed value* out of every relevant cell using only
Node's built-in `zlib`. No number in the fixture was typed by a human. Output:

- `src/model/__fixtures__/spreadsheet.json` — full grids: Monthly Base, the contractual loan
  schedule, the Owner Pay engine, all four Salary Scenarios blocks, the Monthly Cash Flow
  presentation and the Dashboard year table (63 rows each).
- `src/model/__fixtures__/reference-values.json` — the compact headline set the app itself imports
  for the Reconciliation screen.

**2. The formulas are re-implemented from first principles.** The calculation layer never reads
the fixture at runtime. Getting this right meant reproducing Excel's exact semantics — notably
`ROUND` as half-away-from-zero (JavaScript's `Math.round` is half-up, which diverges on negatives)
and the precise ordering inside a sweep month: the lump sum is limited to the cash left *after*
scheduled debt, payroll and tax, and to the loan balance left *after* that month's scheduled
payment.

**3. Everything is compared.** `npm test` runs **220 assertions**:

- Membership ramp — all 60 operating months
- Revenue, VAT, card fees, opex and EBITDA — all 63 months
- The contractual loan schedule — 63 months × 8 columns, plus an explicit check that grace is
  genuinely free (no interest, no payment) before timeline month 12
- The sweep + owner-pay engine — 63 months × 22 columns, for the base case **and** all four
  scenarios
- The owner-facing cash presentation — including a check that cash in − cash out reconciles
  exactly to the change in bank cash, every single month
- The Dashboard five-year table
- All 13 headline metrics per scenario
- Every checkpoint quoted in the project brief

`npm run reconcile` prints the report and writes it to [`RECONCILIATION.md`](RECONCILIATION.md):

```
Checked 116 outputs · 116 matched · 0 mismatched
Largest difference: 4.746e-4 (Base case — operating year 2 · Operating cash out)
Tolerance: 0.005 — the workbook stores ~10 significant digits.
```

**On tolerance.** The workbook stores computed values to about ten significant digits, so a
balance of ₪1,105,309.8385 comes back as `1105309.839`. The 0.005 tolerance covers that storage
rounding and nothing more — every difference observed is at least an order of magnitude below it.
It is display precision in the source file, not a modelling difference.

### Verified checkpoints

| | A — Debt-Max | B — Balanced | C — Earlier Full Pay | D — Early Balanced |
| --- | --- | --- | --- | --- |
| Debt-free operating month | 42 | 42 | 54 | 47 |
| Prime loan debt-free | 36 | 42 | 48 | 42 |
| First salary operating month | 43 | 13 | 7 | 7 |
| Owner gross salaries, 5 yr | ₪360,000 | ₪660,000 | ₪1,080,000 | ₪670,000 |
| Company payroll, 5 yr | ₪432,000 | ₪792,000 | ₪1,296,000 | ₪804,000 |
| Interest saved | ₪48,787 | ₪37,952 | ₪17,003 | ₪32,748 |
| Extra debt prepayments | ₪613,329 | ₪522,877 | ₪394,539 | ₪509,480 |
| Year 5 bank cash | ₪1,469,751 | ₪1,184,208 | ₪779,997 | ₪1,170,961 |
| Cash above target | ₪1,319,751 | ₪1,034,208 | ₪629,997 | ₪1,020,961 |
| 50% per partner | ₪659,875 | ₪517,104 | ₪314,998 | ₪510,480 |
| Lowest cash after reopening | ₪126,844 | ₪126,844 | **(₪43,608)** | ₪89,793 |

Scenario C goes cash-negative and is flagged in red as a liquidity failure everywhere it appears.

Also verified: cash after build + modelled VAT refund **₪160,870**; contractual debt service after
grace **₪20,881/month** beginning timeline month 12 / operating month 10; operating cost
**₪69,849 gross / ₪63,914 ex VAT** per month; reopening members **238**.

---

## The screens

| Screen | What it is for |
| --- | --- |
| **Dashboard** | The ten-second view: members, cash, debt, owner pay, the five-year table, three charts |
| **Monthly cash flow** | All 63 months. Cash in / cash out / result, sticky month column, event and cash-target flags. Tap any month for a full breakdown |
| **Scenario lab** | Owner-pay policies side by side, editable in place, with green / amber / red liquidity states |
| **Financing** | Each loan separately, the grace period explained, every sweep, and the full balance timeline |
| **Operating costs** | Every monthly cost line, editable, with VAT treatment and notes |
| **Inputs** | Every assumption, grouped and in plain English |
| **Plan vs actual** | Enter what really happened; see the variance against plan |
| **Reconciliation** | Spreadsheet value / App value / Difference for every key output |

### Design notes

Amounts are always ₪. Negatives are red and in parentheses — `(₪43,608)`. Zeros render as an
em dash so the eye lands on the numbers that matter. Numerals are tabular so columns align.
The layout is desktop-first with a genuine mobile treatment: cards stack, the wide monthly table
becomes a tap-through list of month cards, and the bottom tab bar replaces the top nav. Light and
dark both follow the OS setting. Charts do not animate — the model recalculates on every
keystroke, and re-animating a chart each time is noise.

A month whose cash *fell because a lump sum was deliberately sent to debt* says so in plain
English rather than looking like a loss:

> Cash decreased this month because ₪64,189 was intentionally sent to debt.

---

## Modelling decisions worth knowing

These follow the reference workbook exactly and should not be changed without re-checking parity:

1. **Build months are separate from operating months.** The 63-month timeline is month 0 (funding)
   + 3 build months + 60 operating months. Operating month 1 is the reopening month.
2. **Grace is genuinely free.** No interest accrues and no payment falls due for 12 months from
   funding. Because the rebuild consumes part of it, payments begin at *timeline* month 12 —
   operating month 10.
3. **Sweeps run on the operating-month calendar** (every 6 months from operating month 12) but are
   additionally blocked before timeline month 12, so no voluntary prepayment happens during grace.
4. **Prime debt is always retired before the 0% loan.** Loan B first, then Loan A.
5. **A sweep uses cash above the target *after* scheduled debt, payroll and tax**, and can never
   exceed the balance remaining after that month's scheduled payment.
6. **When debt hits zero, scheduled payments stop.**
7. **Employer load is real company cash out.** ₪10,000 gross each costs the company ₪24,000/month.
   Owners' personal income tax and National Insurance are outside this company cash model.
8. **No automatic distributions.** Cash above the target stays in the company; the app shows what
   *could* be distributed, never assumes it is.
9. **Depreciation is non-cash.** It reduces taxable income only and never touches bank cash.
10. **VAT timing matters.** Ongoing trading is modelled in ex-VAT economics; the one large timing
    effect that genuinely moves cash — the ₪151,934 build VAT refund in timeline month 2 — is
    modelled explicitly. On the monthly screen this is folded into "Operating cash out", which is
    gross collections less what the gym actually generates, so cash in − cash out always
    reconciles exactly to the change in bank cash.
11. **Moatza is off by default** and is incremental only until total membership reaches capacity;
    beyond that it displaces organic demand.
12. **The cash target is an operating target, not a legal floor** — it is editable per scenario.

---

## Data and privacy

Everything runs in the browser. Inputs, scenarios and actuals are saved to `localStorage` on the
device; there is no server, no account and no sync. Clearing site data resets the app to the
spreadsheet defaults.

`AppState.tsx` deliberately keeps all persisted state in a single serialisable object, so moving
to a cloud datastore later means replacing two functions (`load` and the save effect) rather than
touching the app.

## Built to grow into

The structure anticipates, without pre-building: authentication and a cloud database; multiple gym
locations; bank and accountant imports; member-management-system integration; owner distributions;
an equipment-replacement reserve; marketing CAC modelling; signed Moatza agreement scenarios; and
conservative / base / aggressive cases. The model layer takes assumptions as an argument
throughout, so a second location or a third case is another `runModel` call, not a rewrite.

---

## Stack

TypeScript · React 19 · Vite 7 · Tailwind CSS 4 · Recharts · Vitest. No routing, state-management,
date or spreadsheet library — each was considered and none earned its weight for eight fixed
screens and one pure model.
