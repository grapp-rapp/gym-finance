# Buy, refresh, then improve — 19 October 2026

The new plan buys the existing operation for ₪150,000, retains its machines, makes cosmetic improvements and keeps the studio. It replaces general hourly gym staffing with Hodaya at ₪9,000 total employer cost, plus ₪14,500 for studio instructors. Other existing expense lines remain editable. Owner salaries default to zero. The equipment plan now defaults to ₪200,000 across both gyms, with extra debt sweeps paused and purchases funded only when affordable.

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

Current working collections are **₪74,200 gross/month**. Improvements of 5–10% are unverified, so the default assumes no improvement. Optional income, trial memberships and day passes are zero. The acquisition growth plan now starts from the 317 existing members and targets 450 / 550 / 650 / 725 / 800 at successive year ends. Existing-income uplift remains zero; new-member revenue is added separately at the current recurring mix. The flat-income cases below remain downside stress tests.

| Steady collections case | Gross/month | Cash before debt and tax | Cash after scheduled debt, before tax |
|---|---:|---:|---:|
| Current estimate | ₪74,200 | ₪679 | **−₪9,155** |
| +5% | ₪77,910 | ₪3,791 | **−₪6,042** |
| +10% | ₪81,620 | ₪6,904 | **−₪2,930** |
| +15% | ₪85,330 | ₪10,017 | ₪183 |
| +20% | ₪89,040 | ₪13,129 | ₪3,296 |

Amounts above include card fees and VAT settlement, but exclude owner salaries and corporate profit tax. Paying loan principal is not a tax deduction. Gross break-even before tax is approximately **₪85,112/month** after financing. A steady taxable month at first-repayment-month interest requires about **₪87,874 gross**, before owner salaries and without carried tax losses. Aiming only for before-tax break-even leaves very little operating margin.

The full five-year forecast includes tax, brief renovation work with no assumed collection loss, scheduled debt payments, the selected equipment investment and owner policy. Extra debt sweeps are paused by default. The cash target limits voluntary debt payments; it cannot guarantee future liquidity if scheduled repayments exceed trading cash. Negative cash is an unfunded gap, not an assumed overdraft. Full results and explicit 90% / 80% retention stress tests are in [ACQUISITION_COMPARISON.json](ACQUISITION_COMPARISON.json), reproducible with `node scripts/acquisition-report.mjs`.

## Membership growth — updated base case

The dashboard and the top of **Acquisition plan** show the editable member targets, a membership chart and a month-by-month year-one signup guide. Year one rises from 317 in operating month 1 to 450 in month 12 (42% net growth); later targets are 550, 650, 725 and 800. The original rebuild targets remain 450 / 600 / 725 / 800 / 850 and can be selected as a preset.

Targets are active PEOPLE after retention losses and new-member churn, capped at capacity. Current retention assumptions are preserved: historical collections retain 100% by month 12 by default; new members have 2% monthly churn. The model calculates replacement signups as well as net additions. The proposed path requires about 147 signups in year one (fractional expected total 146.30); months 2–12 require roughly 12–15 each. This is a sales requirement, not evidence the market will deliver it. Budgeted marketing and staffing costs are unchanged; check whether they can support that sales effort.

Historical collections remain the starting income. New members contribute the formula-driven current recurring price mix (₪241.25 gross under 85% standard / 10% soldier-student / 5% couple members). Existing memberships are not all repriced immediately. One-month and day-pass quantities stay zero. Target mode pauses manual monthly signups and annual revenue growth to prevent double counting. Price inflation and any existing historical-income uplift retain their separate meanings.

With the unchanged unpaid-owner policy, scheduled payments only and the ₪200,000 equipment plan, this base case produces approximately **₪1,082,918 year-one collections**, **₪274,021 year-one ending bank cash**, and **₪2,097,398 year-five ending cash**. Equipment is first affordable in **operating month 14**. Lowest cash is approximately **₪101,700**. About **₪115,024 debt remains after five years**; contractual repayment finishes in **operating month 72** at the entered terms. These forecasts depend on delivering the membership goals.

Older acquisition saves with zero manual growth use this requested growth path automatically. Existing customized manual signups or annual revenue growth remain active until the user selects target mode. Explicitly disabling targets is respected. New target settings travel with the same saved account model and JSON backups; no database schema change is needed. Original full-rebuild models are unaffected.

## Brief closures during cosmetic work

The base case assumes just **two full closure days** for flooring / painting, with trading continuing around the other work. Closure days are an operational planning input and do not automatically reduce monthly recurring payments, delay the growth ramp or remove running costs. The separate **Collection reduction during work** input defaults to **0%**, with a one-month adjustment window available if refunds, freezes or lost sales are expected. Set a reduction and its affected months only when supported by the work plan.

Older acquisition saves using the stock one-month / 90% collections allowance automatically use the revised no-loss assumption. Other customized collection reductions remain in place. Saving an explicit reduction also saves the closure-day setting, so a deliberate 10% reduction is respected. The original rebuild closure logic is unchanged.

## Membership transition and phase two

- Historical collections mode preserves the entered all-in starting run rate, with separate retention and uplift assumptions; target mode adds the required new members. Manual annual growth and signup settings are available when targets are off. Flat retention is a scenario assumption, not evidence of long-term renewals.
- Cohort mode lets existing memberships expire and renew at the current recurring product mix. Its initial twelve-month expiry schedule, 80% renewal rate and 2% monthly churn after renewal are illustrative, not customer records. Replace them with the actual member ledger.
- Prepaid members remain active but generate no new cash before renewal. Earned service revenue and new cash collections are kept separate. Seller settlement adds opening cash once and is not recurring sales or profit.
- Phase two defaults on with a combined ₪200,000 equipment budget, initially split ₪100,000 men / ₪100,000 women. The earliest review is month 4; the actual purchase waits until affordable. Its affordability gate requires three completed months of positive trading cash after scheduled debt, tax and owners, excluding capital VAT refunds, and enough bank cash to fund the upgrade while retaining the cash target. Otherwise it defers. It does not automatically increase revenue.
- Retain the no-touch entry approach, but confirm the actual coverage / emergency arrangement and insurance before fixing the staffing budget.

## Equipment-first allocation — revised policy

Extra debt sweeps default **off**. Scheduled repayments are unchanged. The men’s and women’s spaces share one equipment budget, one aggregate membership/capacity forecast and the existing running-cost ledger; no second lease or staff budget is invented. The split is editable and always sums to the combined total.

The full ₪500,000 alternative covers **equipment for both gyms only**, as clarified by the owner. It is added to the existing ₪395,000 purchase/cosmetic/setup budget; it replaces the ₪200,000 equipment option rather than being added on top of it. Both figures are treated as gross including VAT, subject to actual invoices and quotations.

| Equipment option | Men / women allowance | Purchase + cosmetics + equipment | First affordable operating month | Extra upfront cash to buy at takeover |
|---|---:|---:|---:|---:|
| ₪200,000 | ₪100k / ₪100k | ₪595,000 | 14 | ₪195,000 |
| ₪500,000 | ₪250k / ₪250k | ₪895,000 | 27 | ₪495,000 |

Each comparison uses identical growth and owner pay, scheduled payments only, the current ₪500,000 loan and no additional owner funding. The purchase is a single combined order, not a staged procurement schedule. The three-month positive-trading gate and cash target remain active; future VAT refunds cannot fund the gross order upfront. Equipment carries no automatic revenue or capacity uplift. Delaying equipment while keeping the same sales targets is a scenario assumption that needs commercial validation.

To buy everything at takeover and keep ₪100,000 cash, total funding would be ₪695,000 or ₪995,000 respectively, before future VAT refunds. The displayed shortfall is **not** automatically borrowed or added as equity. Users can model a different funding choice explicitly through Financing. Salary scenarios, running costs and pricing are otherwise unchanged.

Existing acquisition models receive this requested capital policy once on load. A version marker preserves subsequent budget changes, deliberate exclusions and any later decision to resume sweeps. Browser cache/import and remote cloud records use the same migration. Full-rebuild plans and historical actuals are retained.

## Existing saved models

Existing browser and cloud models retain their old assumptions until **Acquisition plan → Apply acquisition plan and keep old-plan copy** is selected. That action preserves the previous assumptions, owner scenarios, dates and actuals. The new operating calendar has separate actuals. The previous plan can be restored; the saved copy is also included in JSON backups and normal account synchronization.

## Cost references

Checked 19 October 2026. Our whole-project allowances above are estimates; the linked material / domestic-room examples are context only.

- [Israeli gym flooring supplier](https://galil-sport.com/%D7%9E%D7%95%D7%A6%D7%A8/eg-rf100-2001/): rubber tile product and installation options; obtain a site quotation for the complete floor.
- [Midrag — office painting](https://www.midrag.co.il/Content/Tip/14604): example 200 m² jobs around ₪16–20k, with scope-dependent preparation and ceiling work.
- [Maor — bathroom renovation](https://www.maor-shiputsim.com/he/services/bathroom-and-toilet-renovation): indicative small-room and standard-room ranges; commercial changing rooms require their own specification.
