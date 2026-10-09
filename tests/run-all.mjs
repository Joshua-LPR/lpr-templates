// Run every *.test.mjs in this folder (one fresh browser each), then summarize.
//   node tests/run-all.mjs            all suites
//   node tests/run-all.mjs flow sig   only suites whose filename contains a word
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const filters = process.argv.slice(2);
const files = readdirSync(here).filter(f => f.endsWith('.test.mjs')).filter(f => !filters.length || filters.some(w => f.includes(w))).sort();
const summary = [];
for (const f of files) {
  const r = spawnSync(process.execPath, [join(here, f)], { encoding: 'utf-8', timeout: 600000 });
  const out = (r.stdout || '') + (r.stderr || '').split('\n').filter(l => !/Assertion failed: !\(handle->flags/.test(l)).join('\n');
  process.stdout.write(out);
  const lines = (r.stdout || '').split('\n');
  summary.push({ f, pass: lines.filter(l => l.startsWith('PASS')).length, fail: lines.filter(l => l.startsWith('FAIL')).length, code: r.status });
}
console.log('\n================ SUMMARY ================');
for (const s of summary) console.log(`${s.fail || s.code ? 'FAIL' : 'ok  '}  ${s.f.padEnd(28)} ${s.pass} passed, ${s.fail} failed`);
const failed = summary.some(s => s.fail || s.code);
console.log(failed ? '\nSOME SUITES FAILED' : '\nALL SUITES PASSED');
process.exitCode = failed ? 1 : 0;
