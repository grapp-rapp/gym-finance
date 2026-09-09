# Spreadsheet Reconciliation Report

Generated 2026-09-09 from `reference/model.xlsx`.

| | |
| --- | --- |
| Outputs checked | **116** |
| Matched | **116** |
| Mismatched | **0** |
| Largest difference | 4.746e-4 |
| Where | Base case — operating year 2 · Operating cash out |
| Tolerance | 0.005 |

> **Full parity.** Every checked output matches the reference workbook. The largest difference anywhere is smaller than the workbook's own storage precision — it keeps about ten significant digits, so ₪1,105,309.8385 is stored as `1105309.839`. These are display-precision artefacts in the source file, not modelling differences.

Reproduce with `npm test` (220 assertions, roughly 8,000 individual cell comparisons)
or regenerate this file with `npm run reconcile`.


## Model foundations

| Metric | Spreadsheet | App | Difference | Source cell |
| --- | ---: | ---: | ---: | --- |
| Core operating cost — gross / month | 69,849.00 | 69,849.00 | 0 | `'Operating Costs'!B23` |
| Core operating cost — ex VAT / month | 63,913.73 | 63,913.73 | 3.56e-6 | `'Operating Costs'!C23` |
| Blended membership fee | 223.00 | 223.00 | 0 | `Inputs!B44` |
| Reopening members | 238.00 | 238.00 | 0 | `'5-Year Summary'!B23` |
| Startup VAT refund | 151,933.73 | 151,933.73 | 0 | `'Startup & Funding'!B16` |
| Cash headroom at funding | 68,990.00 | 68,990.00 | -4.37e-11 | `'Startup & Funding'!B19` |
| Cash after build + VAT refund | 160,869.73 | 160,869.73 | -5.82e-11 | `'Startup & Funding'!B22` |

## Financing

| Metric | Spreadsheet | App | Difference | Source cell |
| --- | ---: | ---: | ---: | --- |
| Current Prime rate | 0.05 | 0.05 | 0 | `Inputs!B13` |
| Loan A monthly payment | 4,000.00 | 4,000.00 | 0 | `Financing!B10` |
| Loan B monthly payment | 16,881.22 | 16,881.22 | 1.20e-6 | `Financing!C10` |
| Combined debt service after grace | 20,881.22 | 20,881.22 | 1.20e-6 | `Financing!D10` |
| Payments begin — timeline month | 12.00 | 12.00 | 0 | `Financing!D12` |
| Payments begin — operating month | 10.00 | 10.00 | 0 | `Financing!D13` |
| Contractual Loan B interest (no sweeps) | 109,909.41 | 109,909.41 | -6.45e-7 | `Financing!G17:G79` |

## Base case — operating year 1

| Metric | Spreadsheet | App | Difference | Source cell |
| --- | ---: | ---: | ---: | --- |
| Cash collected | 998,544.00 | 998,544.00 | 0 | `Dashboard!B13` |
| Operating cash out | 927,747.25 | 927,747.25 | 3.73e-5 | `Dashboard!C13` |
| Debt paid | 81,666.48 | 81,666.48 | 2.71e-6 | `Dashboard!D13` |
| Tax paid | 0.00 | 0.00 | 0 | `Dashboard!E13` |
| Owner payroll | 0.00 | 0.00 | 0 | `Dashboard!F13` |
| Total cash out | 1,009,413.73 | 1,009,413.73 | 0 | `Dashboard!G13` |
| Net cash change | -10,869.73 | -10,869.73 | 6.18e-11 | `Dashboard!H13` |
| Ending bank cash | 150,000.00 | 150,000.00 | 0 | `Dashboard!I13` |
| Debt remaining | 1,068,862.66 | 1,068,862.66 | -2.55e-4 | `Dashboard!J13` |
| End members | 450.00 | 450.00 | 0 | `Dashboard!K13` |

## Base case — operating year 2

| Metric | Spreadsheet | App | Difference | Source cell |
| --- | ---: | ---: | ---: | --- |
| Cash collected | 1,500,294.00 | 1,500,294.00 | 0 | `Dashboard!B14` |
| Operating cash out | 1,008,537.51 | 1,008,537.51 | 4.75e-4 | `Dashboard!C14` |
| Debt paid | 424,218.24 | 424,218.24 | -1.88e-5 | `Dashboard!D14` |
| Tax paid | 67,538.26 | 67,538.26 | 4.27e-6 | `Dashboard!E14` |
| Owner payroll | 0.00 | 0.00 | 0 | `Dashboard!F14` |
| Total cash out | 1,500,294.00 | 1,500,294.00 | -2.33e-10 | `Dashboard!G14` |
| Net cash change | 0.00 | 0.00 | 2.91e-11 | `Dashboard!H14` |
| Ending bank cash | 150,000.00 | 150,000.00 | 0 | `Dashboard!I14` |
| Debt remaining | 679,457.94 | 679,457.94 | -3.95e-5 | `Dashboard!J14` |
| End members | 600.00 | 600.00 | 0 | `Dashboard!K14` |

## Base case — operating year 3

| Metric | Spreadsheet | App | Difference | Source cell |
| --- | ---: | ---: | ---: | --- |
| Cash collected | 1,864,899.00 | 1,864,899.00 | 0 | `Dashboard!B15` |
| Operating cash out | 1,067,245.09 | 1,067,245.09 | 2.20e-4 | `Dashboard!C15` |
| Debt paid | 636,626.70 | 636,626.70 | -9.23e-6 | `Dashboard!D15` |
| Tax paid | 161,027.21 | 161,027.21 | -1.11e-5 | `Dashboard!E15` |
| Owner payroll | 0.00 | 0.00 | 0 | `Dashboard!F15` |
| Total cash out | 1,864,899.00 | 1,864,899.00 | -6.98e-10 | `Dashboard!G15` |
| Net cash change | 0.00 | 0.00 | 2.91e-10 | `Dashboard!H15` |
| Ending bank cash | 150,000.00 | 150,000.00 | 0 | `Dashboard!I15` |
| Debt remaining | 58,610.86 | 58,610.86 | 1.14e-6 | `Dashboard!J15` |
| End members | 725.00 | 725.00 | 0 | `Dashboard!K15` |

## Base case — operating year 4

| Metric | Spreadsheet | App | Difference | Source cell |
| --- | ---: | ---: | ---: | --- |
| Cash collected | 2,127,147.00 | 2,127,147.00 | 0 | `Dashboard!B16` |
| Operating cash out | 1,109,471.47 | 1,109,471.47 | 1.02e-4 | `Dashboard!C16` |
| Debt paid | 58,610.86 | 58,610.86 | 1.14e-6 | `Dashboard!D16` |
| Tax paid | 215,261.49 | 215,261.49 | -3.39e-6 | `Dashboard!E16` |
| Owner payroll | 0.00 | 0.00 | 0 | `Dashboard!F16` |
| Total cash out | 1,383,343.82 | 1,383,343.82 | -4.61e-4 | `Dashboard!G16` |
| Net cash change | 743,803.18 | 743,803.18 | -3.94e-5 | `Dashboard!H16` |
| Ending bank cash | 893,803.18 | 893,803.18 | -3.94e-5 | `Dashboard!I16` |
| Debt remaining | 0.00 | 0.00 | 0 | `Dashboard!J16` |
| End members | 800.00 | 800.00 | 0 | `Dashboard!K16` |

## Base case — operating year 5

| Metric | Spreadsheet | App | Difference | Source cell |
| --- | ---: | ---: | ---: | --- |
| Cash collected | 2,291,498.00 | 2,291,498.00 | 0 | `Dashboard!B17` |
| Operating cash out | 1,135,934.76 | 1,135,934.76 | -2.88e-4 | `Dashboard!C17` |
| Debt paid | 0.00 | 0.00 | 0 | `Dashboard!D17` |
| Tax paid | 246,975.66 | 246,975.66 | -2.37e-5 | `Dashboard!E17` |
| Owner payroll | 0.00 | 0.00 | 0 | `Dashboard!F17` |
| Total cash out | 1,382,910.43 | 1,382,910.43 | 2.88e-4 | `Dashboard!G17` |
| Net cash change | 908,587.57 | 908,587.57 | 1.19e-5 | `Dashboard!H17` |
| Ending bank cash | 1,802,390.76 | 1,802,390.76 | 1.72e-4 | `Dashboard!I17` |
| Debt remaining | 0.00 | 0.00 | 0 | `Dashboard!J17` |
| End members | 850.00 | 850.00 | 0 | `Dashboard!K17` |

## Scenario A — Debt-Max

| Metric | Spreadsheet | App | Difference | Source cell |
| --- | ---: | ---: | ---: | --- |
| Debt-free operating month | 42.00 | 42.00 | 0 | `'Salary Scenarios'!B13` |
| Prime loan debt-free operating month | 36.00 | 36.00 | 0 | `'Salary Scenarios'!B14` |
| First owner salary operating month | 43.00 | 43.00 | 0 | `'Salary Scenarios'!B15` |
| Owner gross salaries — 5 years | 360,000.00 | 360,000.00 | 0 | `'Salary Scenarios'!B16` |
| Company owner payroll — 5 years | 432,000.00 | 432,000.00 | 0 | `'Salary Scenarios'!B17` |
| Interest saved | 48,787.14 | 48,787.14 | 2.69e-6 | `'Salary Scenarios'!B18` |
| Extra lump-sum debt prepayments | 613,329.31 | 613,329.31 | -1.66e-5 | `'Salary Scenarios'!B19` |
| Year 5 company cash | 1,469,750.76 | 1,469,750.76 | 1.72e-4 | `'Salary Scenarios'!B20` |
| Year 5 cash above target | 1,319,750.76 | 1,319,750.76 | 1.72e-4 | `'Salary Scenarios'!B21` |
| 50% per partner if distributed | 659,875.38 | 659,875.38 | -1.38e-5 | `'Salary Scenarios'!B22` |
| Months debt eliminated early | 27.00 | 27.00 | 0 | `'Salary Scenarios'!B23` |
| Minimum cash — full timeline | 28,954.00 | 28,954.00 | -5.09e-11 | `'Salary Scenarios'!B25` |
| Minimum cash after reopening | 126,843.93 | 126,843.93 | -1.02e-5 | `'Salary Scenarios'!B27` |

## Scenario B — Balanced

| Metric | Spreadsheet | App | Difference | Source cell |
| --- | ---: | ---: | ---: | --- |
| Debt-free operating month | 42.00 | 42.00 | 0 | `'Salary Scenarios'!C13` |
| Prime loan debt-free operating month | 42.00 | 42.00 | 0 | `'Salary Scenarios'!C14` |
| First owner salary operating month | 13.00 | 13.00 | 0 | `'Salary Scenarios'!C15` |
| Owner gross salaries — 5 years | 660,000.00 | 660,000.00 | 0 | `'Salary Scenarios'!C16` |
| Company owner payroll — 5 years | 792,000.00 | 792,000.00 | 0 | `'Salary Scenarios'!C17` |
| Interest saved | 37,952.11 | 37,952.11 | -2.64e-7 | `'Salary Scenarios'!C18` |
| Extra lump-sum debt prepayments | 522,877.01 | 522,877.01 | 1.92e-5 | `'Salary Scenarios'!C19` |
| Year 5 company cash | 1,184,207.79 | 1,184,207.79 | -1.72e-4 | `'Salary Scenarios'!C20` |
| Year 5 cash above target | 1,034,207.79 | 1,034,207.79 | -1.72e-4 | `'Salary Scenarios'!C21` |
| 50% per partner if distributed | 517,103.89 | 517,103.89 | 1.39e-5 | `'Salary Scenarios'!C22` |
| Months debt eliminated early | 27.00 | 27.00 | 0 | `'Salary Scenarios'!C23` |
| Minimum cash — full timeline | 28,954.00 | 28,954.00 | -5.09e-11 | `'Salary Scenarios'!C25` |
| Minimum cash after reopening | 126,843.93 | 126,843.93 | -1.02e-5 | `'Salary Scenarios'!C27` |

## Scenario C — Earlier Full Owner Pay

| Metric | Spreadsheet | App | Difference | Source cell |
| --- | ---: | ---: | ---: | --- |
| Debt-free operating month | 54.00 | 54.00 | 0 | `'Salary Scenarios'!D13` |
| Prime loan debt-free operating month | 48.00 | 48.00 | 0 | `'Salary Scenarios'!D14` |
| First owner salary operating month | 7.00 | 7.00 | 0 | `'Salary Scenarios'!D15` |
| Owner gross salaries — 5 years | 1,080,000.00 | 1,080,000.00 | 0 | `'Salary Scenarios'!D16` |
| Company owner payroll — 5 years | 1,296,000.00 | 1,296,000.00 | 0 | `'Salary Scenarios'!D17` |
| Interest saved | 17,002.61 | 17,002.61 | -4.85e-6 | `'Salary Scenarios'!D18` |
| Extra lump-sum debt prepayments | 394,539.19 | 394,539.19 | -3.34e-5 | `'Salary Scenarios'!D19` |
| Year 5 company cash | 779,996.67 | 779,996.67 | -4.29e-5 | `'Salary Scenarios'!D20` |
| Year 5 cash above target | 629,996.67 | 629,996.67 | -4.29e-5 | `'Salary Scenarios'!D21` |
| 50% per partner if distributed | 314,998.33 | 314,998.33 | 2.86e-5 | `'Salary Scenarios'!D22` |
| Months debt eliminated early | 15.00 | 15.00 | 0 | `'Salary Scenarios'!D23` |
| Minimum cash — full timeline | -43,607.94 | -43,607.94 | -1.32e-6 | `'Salary Scenarios'!D25` |
| Minimum cash after reopening | -43,607.94 | -43,607.94 | -1.32e-6 | `'Salary Scenarios'!D27` |

## Scenario D — Early Balanced

| Metric | Spreadsheet | App | Difference | Source cell |
| --- | ---: | ---: | ---: | --- |
| Debt-free operating month | 47.00 | 47.00 | 0 | `'Salary Scenarios'!E13` |
| Prime loan debt-free operating month | 42.00 | 42.00 | 0 | `'Salary Scenarios'!E14` |
| First owner salary operating month | 7.00 | 7.00 | 0 | `'Salary Scenarios'!E15` |
| Owner gross salaries — 5 years | 670,000.00 | 670,000.00 | 0 | `'Salary Scenarios'!E16` |
| Company owner payroll — 5 years | 804,000.00 | 804,000.00 | 0 | `'Salary Scenarios'!E17` |
| Interest saved | 32,748.36 | 32,748.36 | -2.13e-6 | `'Salary Scenarios'!E18` |
| Extra lump-sum debt prepayments | 509,480.12 | 509,480.12 | -2.23e-5 | `'Salary Scenarios'!E19` |
| Year 5 company cash | 1,170,960.90 | 1,170,960.90 | 3.01e-4 | `'Salary Scenarios'!E20` |
| Year 5 cash above target | 1,020,960.90 | 1,020,960.90 | 3.01e-4 | `'Salary Scenarios'!E21` |
| 50% per partner if distributed | 510,480.45 | 510,480.45 | -4.94e-5 | `'Salary Scenarios'!E22` |
| Months debt eliminated early | 22.00 | 22.00 | 0 | `'Salary Scenarios'!E23` |
| Minimum cash — full timeline | 28,954.00 | 28,954.00 | -5.09e-11 | `'Salary Scenarios'!E25` |
| Minimum cash after reopening | 89,793.07 | 89,793.07 | -2.40e-7 | `'Salary Scenarios'!E27` |
