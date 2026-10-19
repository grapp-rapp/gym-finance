# Buy, refresh, then improve — 19 October 2026

The new plan buys the existing operation for ₪150,000, retains its machines, makes cosmetic improvements and keeps the studio. It replaces general hourly gym staffing with Hodaya at ₪9,000 total employer cost, plus ₪14,500 for studio instructors. Other existing expense lines remain editable. Owner salaries and phase-two equipment spending default to zero / off.

## Initial cash budget

All figures are **gross cash**, including invoice VAT where applicable. These are planning allowances, not site quotations.

| Item | Gross budget |
|---|---:|
| Buy the existing gym | ₪150,000 |
| Flooring | ₪65,000 |
| Painting and wall repairs | ₪20,000 |
| Bathrooms / changing rooms | ₪60,000 |
| Lighting / minor electrical work | ₪10,000 |
| Reception / signs / branding | ₪12,000 |
| Automated access / cameras | ₪15,000 |
| Studio weights | ₪8,000 |
| Service existing machines | ₪10,000 |
| Renovation contingency, 15% | ₪30,000 |
| Legal / accounting / migration | ₪15,000 |
| **Purchase, work and setup** | **₪395,000** |
| **Cash retained in the bank** | **₪100,000** |
| **Initial funding requirement** | **₪495,000** |

A ₪500,000 loan leaves ₪105,000 immediately after startup spending. A later modelled startup VAT refund is approximately ₪32,797. It is **not** counted as money available on closing day. The purchase carries no assumed VAT credit until its invoice / transaction treatment is confirmed. Contingency is conservatively assumed spent, with no VAT credit until supported by invoices; unspent contingency remains cash.

The flooring allowance provisionally assumes roughly 300 m²; this area is unverified. Bathrooms assume modest refurbishment of two wet areas. Substantial drainage, waterproofing, structural or electrical replacement needs a new quote and budget.

## Operations and financing

The current app ledger, after the two agreed staffing changes, totals **₪67,509 gross per month**, or **₪61,574 excluding recoverable invoice VAT**, before payment fees, debt, tax and owners. This is a different line-item budget from the grouped ₪70,805 figure discussed elsewhere; it should be reconciled to actual bills rather than mixing the two sets of expenses. Cleaning remains an outsourced expense and is counted once. No additional hourly gym-floor or reception employee is included.

The loan assumption is ₪500,000 at a modelled annual rate of 4.75%, with no payments for twelve complete operating months, monthly interest capitalized, then sixty amortizing payments. This is a planning rate, not a current bank offer. Balance after grace: **₪524,274**. Payment from operating month 13: **₪9,834/month**. The interest-free loan is zero.

Current working collections are **₪74,200 gross/month**. Improvements of 5–10% are unverified, so the default assumes no improvement. Optional income, trial memberships and day passes are zero. The old automatic growth from 360 to 850 members does not drive the acquisition forecast.

| Steady collections case | Gross/month | Cash before debt and tax | Cash after scheduled debt, before tax |
|---|---:|---:|---:|
| Current estimate | ₪74,200 | ₪679 | **−₪9,155** |
| +5% | ₪77,910 | ₪3,791 | **−₪6,042** |
| +10% | ₪81,620 | ₪6,904 | **−₪2,930** |
| +15% | ₪85,330 | ₪10,017 | ₪183 |
| +20% | ₪89,040 | ₪13,129 | ₪3,296 |

Amounts above include card fees and VAT settlement, but exclude owner salaries and corporate profit tax. Paying loan principal is not a tax deduction. Gross break-even before tax is approximately **₪85,112/month** after financing. A steady taxable month at first-repayment-month interest requires about **₪87,874 gross**, before owner salaries and without carried tax losses. Aiming only for before-tax break-even leaves very little operating margin.

The full five-year forecast includes tax, one month at 90% collections during works, debt sweeps and the selected owner policy. The cash target limits voluntary debt payments; it cannot guarantee future liquidity if scheduled repayments exceed trading cash. Negative cash is an unfunded gap, not an assumed overdraft. Full results and explicit 90% / 80% retention stress tests are in [ACQUISITION_COMPARISON.json](ACQUISITION_COMPARISON.json), reproducible with `node scripts/acquisition-report.mjs`.

## Membership transition and phase two

- Historical collections mode holds the entered all-in run rate, with separate editable uplift, retention, annual growth and new-member assumptions. Flat retention is a scenario assumption, not evidence of long-term renewals.
- Cohort mode lets existing memberships expire and renew at the current recurring product mix. Its initial twelve-month expiry schedule, 80% renewal rate and 2% monthly churn after renewal are illustrative, not customer records. Replace them with the actual member ledger.
- Prepaid members remain active but generate no new cash before renewal. Earned service revenue and new cash collections are kept separate. Seller settlement adds opening cash once and is not recurring sales or profit.
- Phase two defaults off, with an editable ₪150,000 proposal from month 18. Its affordability gate requires three completed months of positive trading cash after scheduled debt, tax and owners, excluding capital VAT refunds, and enough bank cash to fund the upgrade while retaining the cash target. Otherwise it defers. It does not automatically increase revenue.
- Retain the no-touch entry approach, but confirm the actual coverage / emergency arrangement and insurance before fixing the staffing budget.

## Existing saved models

Existing browser and cloud models retain their old assumptions until **Acquisition plan → Apply acquisition plan and keep old-plan copy** is selected. That action preserves the previous assumptions, owner scenarios, dates and actuals. The new operating calendar has separate actuals. The previous plan can be restored; the saved copy is also included in JSON backups and normal account synchronization.

## Cost references

Checked 19 October 2026. Our whole-project allowances above are estimates; the linked material / domestic-room examples are context only.

- [Israeli gym flooring supplier](https://galil-sport.com/%D7%9E%D7%95%D7%A6%D7%A8/eg-rf100-2001/): rubber tile product and installation options; obtain a site quotation for the complete floor.
- [Midrag — office painting](https://www.midrag.co.il/Content/Tip/14604): example 200 m² jobs around ₪16–20k, with scope-dependent preparation and ceiling work.
- [Maor — bathroom renovation](https://www.maor-shiputsim.com/he/services/bathroom-and-toilet-renovation): indicative small-room and standard-room ranges; commercial changing rooms require their own specification.
