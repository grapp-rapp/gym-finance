/**
 * `npm run reconcile` — prints the Spreadsheet / App / Difference report and refreshes
 * RECONCILIATION.md.
 *
 * A three-line wrapper rather than a `VAR=x` prefix in package.json, because that syntax
 * does not work when npm runs scripts through cmd.exe on Windows, and a cross-env dependency
 * is not worth carrying for one variable.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  [
    'node_modules/vitest/vitest.mjs',
    'run',
    'src/model/__tests__/reconciliation.test.ts',
    '--reporter=verbose',
  ],
  { stdio: 'inherit', env: { ...process.env, RECONCILE_REPORT: '1' } },
);

process.exit(result.status ?? 1);
