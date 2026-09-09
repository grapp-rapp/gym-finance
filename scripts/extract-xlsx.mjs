/**
 * Extracts the reference spreadsheet's computed values into a JSON fixture.
 *
 *   node scripts/extract-xlsx.mjs "path/to/Shaar Binyamin Gym - 5-Year Model.xlsx"
 *
 * An .xlsx file is a ZIP of XML parts. Rather than pull in a spreadsheet library we
 * unzip it with Node's own zlib and read the sheet XML directly — the parser only has
 * to handle the narrow subset this workbook uses (shared strings, numbers, formulas).
 *
 * The output feeds src/model/__tests__/parity.test.ts. The app NEVER reads this file at
 * runtime: it exists purely so the tests can assert that our own implementation of the
 * formulas lands on the same numbers the sheet produced.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Minimal ZIP reader ----------------------------------------------------

function readZip(buffer) {
  const files = new Map();
  // Locate the End Of Central Directory record.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a zip file (no EOCD record)');

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);

  for (let n = 0; n < entryCount; n++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);

    // Re-read the local header: its extra field length can differ from the central one.
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);

    files.set(name, method === 0 ? raw : inflateRawSync(raw));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

// --- XML helpers -----------------------------------------------------------

function unescapeXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&');
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let si;
  while ((si = siRe.exec(xml))) {
    let text = '';
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let t;
    while ((t = tRe.exec(si[1]))) text += t[1];
    strings.push(unescapeXml(text));
  }
  return strings;
}

/** Returns a { A1: value } map of every populated cell on a sheet. */
function parseSheet(xml, sharedStrings) {
  const cells = {};
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let row;
  while ((row = rowRe.exec(xml))) {
    const cellRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cell;
    while ((cell = cellRe.exec(row[2]))) {
      const attrs = cell[1] ?? '';
      const body = cell[2] ?? '';
      const refMatch = /r="([A-Z]+\d+)"/.exec(attrs);
      if (!refMatch) continue;
      const type = (/t="([^"]+)"/.exec(attrs) ?? [, 'n'])[1];
      const valueMatch = /<v[^>]*>([\s\S]*?)<\/v>/.exec(body);
      if (!valueMatch) continue;

      let value;
      if (type === 's') value = sharedStrings[Number(valueMatch[1])];
      else if (type === 'str') value = unescapeXml(valueMatch[1]);
      else if (type === 'e') value = null;
      else value = parseFloat(valueMatch[1]);

      cells[refMatch[1]] = value;
    }
  }
  return cells;
}

// --- Extraction ------------------------------------------------------------

const SHEET_FILES = {
  Dashboard: 'sheet1.xml',
  Inputs: 'sheet2.xml',
  OperatingCosts: 'sheet3.xml',
  Startup: 'sheet4.xml',
  Financing: 'sheet5.xml',
  MonthlyBase: 'sheet6.xml',
  FiveYear: 'sheet7.xml',
  OwnerPay: 'sheet8.xml',
  Scenarios: 'sheet9.xml',
  CashFlow: 'sheet10.xml',
};

const COLUMNS_MONTHLY_BASE = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z AA'.split(' ');
const COLUMNS_OWNER_PAY = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z'.split(' ');
const COLUMNS_FINANCING = 'A B C D E F G H I J'.split(' ');
const ROWS = 63;

function grid(sheet, columns, firstRow, rowCount) {
  const out = [];
  for (let i = 0; i < rowCount; i++) {
    const record = {};
    for (const column of columns) {
      const value = sheet[column + (firstRow + i)];
      record[column] = value === undefined ? null : value;
    }
    out.push(record);
  }
  return out;
}

const source = process.argv[2] ?? resolve(__dirname, '..', 'reference', 'model.xlsx');
const zip = readZip(readFileSync(source));
const decode = (name) => {
  const buf = zip.get(name);
  return buf ? buf.toString('utf8') : null;
};

const sharedStrings = parseSharedStrings(decode('xl/sharedStrings.xml'));
const sheets = {};
for (const [key, file] of Object.entries(SHEET_FILES)) {
  const xml = decode(`xl/worksheets/${file}`);
  if (!xml) throw new Error(`Missing worksheet ${file} in ${source}`);
  sheets[key] = parseSheet(xml, sharedStrings);
}

const scenarioSummaryRows = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27];

const fixture = {
  meta: {
    source: source.replace(/\\/g, '/').split('/').pop(),
    extractedAt: new Date().toISOString().slice(0, 10),
    note: 'Computed values read straight out of the reference workbook. Do not hand-edit.',
  },
  inputs: sheets.Inputs,
  operatingCosts: sheets.OperatingCosts,
  startup: sheets.Startup,
  // "Financing" rows 17-79: the contractual, no-sweep loan schedule.
  financing: grid(sheets.Financing, COLUMNS_FINANCING, 17, ROWS),
  // "Monthly Base" rows 5-67: members, billings, EBITDA, base cash.
  monthlyBase: grid(sheets.MonthlyBase, COLUMNS_MONTHLY_BASE, 5, ROWS),
  // "Owner Pay" rows 21-83: the sweep engine with owner salaries switched off.
  ownerPayBase: grid(sheets.OwnerPay, COLUMNS_OWNER_PAY, 21, ROWS),
  // "Salary Scenarios": four 63-row blocks, one per owner-pay policy.
  scenarioA: grid(sheets.Scenarios, COLUMNS_OWNER_PAY, 31, ROWS),
  scenarioB: grid(sheets.Scenarios, COLUMNS_OWNER_PAY, 101, ROWS),
  scenarioC: grid(sheets.Scenarios, COLUMNS_OWNER_PAY, 171, ROWS),
  scenarioD: grid(sheets.Scenarios, COLUMNS_OWNER_PAY, 241, ROWS),
  // "Monthly Cash Flow" rows 7-69: the owner-facing cash presentation.
  cashFlow: grid(sheets.CashFlow, 'A B C D E F G H I J K L M N O P Q R S T'.split(' '), 7, ROWS),
  // "Dashboard" rows 13-17: the 5-year cash in / cash out table.
  dashboardYears: grid(sheets.Dashboard, 'A B C D E F G H I J K'.split(' '), 13, 5),
  scenarioSummary: Object.fromEntries(
    scenarioSummaryRows.map((r) => [
      `R${r}`,
      {
        label: sheets.Scenarios[`A${r}`],
        A: sheets.Scenarios[`B${r}`],
        B: sheets.Scenarios[`C${r}`],
        C: sheets.Scenarios[`D${r}`],
        D: sheets.Scenarios[`E${r}`],
      },
    ]),
  ),
  fiveYear: Object.fromEntries(
    Array.from({ length: 36 }, (_, i) => i + 5)
      .filter((r) => sheets.FiveYear[`A${r}`] !== undefined)
      .map((r) => [
        `R${r}`,
        {
          label: sheets.FiveYear[`A${r}`],
          B: sheets.FiveYear[`B${r}`],
          C: sheets.FiveYear[`C${r}`],
          D: sheets.FiveYear[`D${r}`],
          E: sheets.FiveYear[`E${r}`],
          F: sheets.FiveYear[`F${r}`],
        },
      ]),
  ),
};

const target = resolve(__dirname, '..', 'src', 'model', '__fixtures__', 'spreadsheet.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(fixture, null, 1));
console.log(`Wrote ${target}`);
console.log(`  monthlyBase rows: ${fixture.monthlyBase.length}`);
console.log(`  scenarios: A/B/C/D × ${ROWS} rows`);

// --- Compact reference values ---------------------------------------------
// The full fixture is ~200KB and is only ever read by the test suite. The app's
// Reconciliation screen needs just the headline numbers, so emit a small file it
// can import without dragging the whole workbook into the bundle.

const summary = fixture.scenarioSummary;
const scenarioKeys = ['A', 'B', 'C', 'D'];
const scenarioValues = Object.fromEntries(
  scenarioKeys.map((key) => [
    key,
    {
      debtFreeOperatingMonth: summary.R13[key],
      primeDebtFreeOperatingMonth: summary.R14[key],
      salaryStartOperatingMonth: summary.R15[key],
      totalOwnerGrossSalaries: summary.R16[key],
      totalOwnerPayrollCost: summary.R17[key],
      interestSaved: summary.R18[key],
      totalExtraDebtPrepayments: summary.R19[key],
      year5EndingCash: summary.R20[key],
      year5CashAboveTarget: summary.R21[key],
      perPartnerIfDistributed: summary.R22[key],
      monthsDebtEliminatedEarly: summary.R23[key],
      minCashFullTimeline: summary.R25[key],
      minCashAfterReopening: summary.R27[key],
    },
  ]),
);

const reference = {
  meta: fixture.meta,
  scenarios: scenarioValues,
  structural: {
    operatingCostGross: sheets.OperatingCosts.B23,
    operatingCostExVat: sheets.OperatingCosts.C23,
    blendedFee: sheets.Inputs.B44,
    reopeningMembers: sheets.FiveYear.B23,
    startupVatRefund: sheets.Startup.B16,
    cashHeadroom: sheets.Startup.B19,
    cashAfterBuild: sheets.Startup.B22,
    loanAPayment: sheets.Financing.B10,
    loanBPayment: sheets.Financing.C10,
    totalDebtService: sheets.Financing.D10,
    primeRate: sheets.Inputs.B13,
    contractualInterest: fixture.financing.reduce((sum, r) => sum + (r.G ?? 0), 0),
    paymentStartTimelineMonth: sheets.Financing.D12,
    paymentStartOperatingMonth: sheets.Financing.D13,
  },
  dashboardYears: fixture.dashboardYears.map((r) => ({
    cashIn: r.B,
    operatingCashOut: r.C,
    debtPaid: r.D,
    taxPaid: r.E,
    ownerPayroll: r.F,
    totalCashOut: r.G,
    netCashChange: r.H,
    endingCash: r.I,
    debtRemaining: r.J,
    endMembers: r.K,
  })),
};

const referenceTarget = resolve(__dirname, '..', 'src', 'model', '__fixtures__', 'reference-values.json');
writeFileSync(referenceTarget, JSON.stringify(reference, null, 1));
console.log(`Wrote ${referenceTarget}`);
