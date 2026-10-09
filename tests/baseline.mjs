// Behaviour snapshot of the whole site, for refactors that must not change it.
//
//   node tests/baseline.mjs capture   → tests/out/baseline/  (run BEFORE changing code)
//   node tests/baseline.mjs compare   → diff the current site against that capture
//
// Per template it records: console errors (load + Edit on/off), the
// localStorage keys/values every saved setting writes (mode bar, Fields tab,
// Options tab, Sender-tab signature rows, a Library copy), the HTML export and
// Save As output (normalized), the print-to-PDF page count, and screenshots of
// the optional-row notices. Compare reports every difference; expected ones
// are listed with --expect <id>[,<id>] (template ids whose output may change).
import { open } from './lib/cdp.mjs';
import { url, templates, APP_PAGES, OUT, suite, openSetupTab, exportAs, saveAs, savedHtml } from './lib/site.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const mode = process.argv[2] || 'compare';
const expectArg = process.argv.indexOf('--expect');
const EXPECT = new Set(expectArg > 0 ? process.argv[expectArg + 1].split(',') : []);
// --expect-save: only the Save As text may change (e.g. an inline <script> edited;
// Save As keeps scripts, HTML export strips them so it is still compared).
const expectSaveArg = process.argv.indexOf('--expect-save');
const EXPECT_SAVE = new Set(expectSaveArg > 0 ? process.argv[expectSaveArg + 1].split(',') : []);
const DIR = join(OUT, mode === 'capture' ? 'baseline' : 'current');
mkdirSync(join(DIR, 'shots'), { recursive: true });
const OPT_ROW_PAGES = ['24-Hour Notice.html', 'Occupant Update.html', 'Tenancy Confirmation.html'];

// Drop date-picker popups (flatpickr) — their "today" marker changes daily.
function dropDatePickers(html) {
  let out = '', i = 0;
  for (;;) {
    const j = html.indexOf('<div class="flatpickr-calendar', i);
    if (j < 0) return out + html.slice(i);
    out += html.slice(i, j);
    let depth = 0, k = j;
    const re = /<div\b|<\/div>/g; re.lastIndex = j;
    for (let m; (m = re.exec(html)); ) { depth += m[0] === '</div>' ? -1 : 1; if (depth === 0) { k = re.lastIndex; break; } }
    i = k;
  }
}
const normalize = html => dropDatePickers(html)
  .replace(/c_[a-z0-9]{6,}/g, 'c_ID')
  .replace(/data-flow-(head|tail)="\d+"/g, 'data-flow-$1="N"')
  .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, 'TIMESTAMP')
  .replace(/lpr-test-[A-Za-z0-9]+/g, 'PROFILE');

const DUMP_STORAGE = `(() => { const out = {}; const ls = window.localStorage; const n = ls.length;
  for (let i = 0; i < n; i++) { const k = Storage.prototype.key.call(ls, i); out[k] = Storage.prototype.getItem.call(ls, k); }
  return out; })()`;

async function exercise(t, tpl) {
  // Every mode-bar button (ends on the second mode of each group, so a
  // non-default value is what gets persisted).
  await t.eval(`(() => { document.querySelectorAll('.mode-bar').forEach(bar => { const b = [...bar.querySelectorAll('.mode-btn')]; b.forEach(x => x.click()); if (b[1]) b[1].click(); }); })()`);
  await t.wait(200);
  // First text input of the Fields and Options tabs.
  for (const tab of ['Fields', 'Options']) {
    if (!(await openSetupTab(t, tab))) continue;
    // Fields: a real text/amount field (the first one is often a date picker,
    // which ignores typed text). Options: its first visible text input.
    const sel = tab === 'Fields' ? '#lpr-fill-panel input[data-ff-key][type="text"]' : '#lpr-fill-panel input[type="text"], #lpr-fill-panel input:not([type])';
    await t.eval(`(() => { const vis = q => [...document.querySelectorAll(q)].find(x => x.offsetParent); const i = vis(${JSON.stringify(sel)}) || vis('#lpr-fill-panel input[type="text"]'); if (!i) return false; i.focus(); i.value = 'Baseline 123'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); i.blur(); return true; })()`);
    await t.wait(400);
  }
  // Sender-tab signature rows (templates with data-sig-options).
  if (await openSetupTab(t, 'Sender')) {
    await t.eval(`(() => { const m = document.querySelector('[data-sigopt="mode"]'), n = document.querySelector('[data-sigopt="tenants"]'); if (!m) return; m.value = 'line'; n.value = '1'; document.getElementById('lpr-own-apply').click(); })()`);
    await t.wait(300);
  }
  await t.eval(`(() => { const p = document.getElementById('lpr-fill-panel'); const x = p && p.querySelector('.lpr-fp-close, [aria-label="Close"], .lpr-close'); if (x) x.click(); })()`);
}

async function capturePage(t, tpl, record) {
  const r = { logs: [], keys: {}, exportHtml: null, saveHtml: null, printPages: null };
  const logStart = t.logs.length;
  const before = await t.eval(DUMP_STORAGE);
  await t.goto(url(tpl.id));
  const hasEdit = await t.eval(`!!document.getElementById('tt-edit-btn')`);
  if (hasEdit) {
    await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(250);
    await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(250);
  }
  await exercise(t, tpl);
  const after = await t.eval(DUMP_STORAGE);
  for (const [k, v] of Object.entries(after)) {
    if (/lpr_custom_templates$/.test(k)) continue;           // Save As payloads: compared separately
    if (before[k] !== v) r.keys[k] = v;
  }
  if (!tpl.flags.noExport && hasEdit) {
    const blobs = await exportAs(t, 'html', 1200);
    const h = blobs.find(b => b.type.startsWith('text/html'));
    r.exportHtml = h ? normalize(h.buf.toString('utf-8')) : null;
  }
  if (hasEdit) {
    const id = await saveAs(t, 'baseline ' + tpl.id);
    r.saveHtml = id ? normalize(await savedHtml(t, id)) : null;
    r.libraryId = id;
  }
  r.printPages = await t.printPdf();
  if (OPT_ROW_PAGES.includes(tpl.id)) {
    await t.goto(url(tpl.id));
    const clip = await t.eval(`(() => { const s = [...document.querySelectorAll('.sheet')].find(s => s.offsetHeight); const r = s.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; })()`);
    await t.shot(join(DIR, 'shots', tpl.id + ' default.png'), clip);
    await t.eval(`document.querySelectorAll('.opt-dismiss').forEach(b => { if (b.offsetParent) b.click(); })`);
    await t.wait(200);
    await t.shot(join(DIR, 'shots', tpl.id + ' all-dismissed.png'), clip);
    r.restoreLabels = await t.eval(`[...document.querySelectorAll('.opt-restore-btn')].map(b => b.textContent.trim())`);
  }
  r.logs = t.logs.slice(logStart);
  record[tpl.id] = r;
}

async function run() {
  const record = { pages: {}, app: {}, library: null };
  const t = await open(url('index.html'));
  try {
    for (const p of APP_PAGES) {
      const s = t.logs.length;
      await t.goto(url(p));
      record.app[p] = { logs: t.logs.slice(s) };
    }
    for (const tpl of templates()) {
      process.stdout.write('  ' + tpl.id + ' … ');
      try { await capturePage(t, tpl, record.pages); console.log('ok'); }
      catch (e) { record.pages[tpl.id] = { error: String(e.message || e) }; console.log('ERROR ' + e.message); }
    }
    // A Library copy: opening it and changing a field writes view_<id> keys.
    const lib = record.pages['Rent Increase Notice.html'];
    if (lib && lib.libraryId) {
      const before = await t.eval(DUMP_STORAGE);
      await t.goto(url('view.html', '?id=' + lib.libraryId));
      await exercise(t, { id: 'view.html', flags: {} });
      const after = await t.eval(DUMP_STORAGE);
      record.library = {};
      for (const [k, v] of Object.entries(after)) if (!/lpr_custom_templates$/.test(k) && before[k] !== v) record.library[normalize(k)] = v;
    }
  } finally { await t.close(); }
  return record;
}

function imageDiff(a, b) {
  try {
    return execFileSync('python', ['-c', `
import sys
from PIL import Image, ImageChops
a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB')
if a.size!=b.size: print('size %s vs %s'%(a.size,b.size)); sys.exit()
d=ImageChops.difference(a,b); bbox=d.getbbox()
print('same' if not bbox else 'differs in %s'%(bbox,))`, a, b], { encoding: 'utf-8' }).trim();
  } catch (e) { return 'diff failed: ' + e.message; }
}

function firstDiff(a, b) {
  if (a === b) return null;
  if (a == null || b == null) return `${a == null ? 'missing before' : 'missing now'}`;
  let i = 0; while (i < a.length && a[i] === b[i]) i++;
  return `at char ${i}: before «${a.slice(Math.max(0, i - 60), i + 80)}» now «${b.slice(Math.max(0, i - 60), i + 80)}»`;
}

const record = await run();
writeFileSync(join(DIR, 'record.json'), JSON.stringify(record, null, 1));

if (mode === 'capture') {
  const errs = Object.entries(record.pages).filter(([, r]) => r.logs && r.logs.length || r.error);
  console.log(`\nBaseline captured: ${Object.keys(record.pages).length} templates → ${DIR}`);
  if (errs.length) console.log('Pre-existing console output / errors:\n' + errs.map(([k, r]) => '  ' + k + ': ' + (r.error || r.logs.join(' | '))).join('\n'));
} else {
  const base = JSON.parse(readFileSync(join(OUT, 'baseline', 'record.json'), 'utf-8'));
  const s = suite('Baseline compare' + (EXPECT.size ? ' (expected changes: ' + [...EXPECT].join(', ') + ')' : ''));
  for (const p of APP_PAGES) s.check(`${p}: no new console errors`, JSON.stringify(record.app[p].logs) === JSON.stringify(base.app[p].logs), record.app[p].logs.join(' | '));
  for (const [id, b] of Object.entries(base.pages)) {
    const c = record.pages[id];
    if (!c) { s.check(`${id}: still present`, EXPECT.has(id), 'template removed'); continue; }
    s.check(`${id}: no new console errors`, JSON.stringify(c.logs) === JSON.stringify(b.logs) && !c.error, (c.error || '') + ' ' + (c.logs || []).join(' | '));
    s.check(`${id}: saved-settings keys + values unchanged`, JSON.stringify(c.keys) === JSON.stringify(b.keys), JSON.stringify({ before: b.keys, now: c.keys }));
    s.check(`${id}: print page count unchanged`, c.printPages === b.printPages, `${b.printPages} → ${c.printPages}`);
    if (!EXPECT.has(id)) {
      const be = b.exportHtml && dropDatePickers(b.exportHtml), bs = b.saveHtml && dropDatePickers(b.saveHtml);
      s.check(`${id}: HTML export unchanged`, c.exportHtml === be, firstDiff(be, c.exportHtml));
      if (!EXPECT_SAVE.has(id)) s.check(`${id}: Save As output unchanged`, c.saveHtml === bs, firstDiff(bs, c.saveHtml));
    }
    if (b.restoreLabels) {
      s.check(`${id}: restore-bar labels unchanged`, JSON.stringify(c.restoreLabels) === JSON.stringify(b.restoreLabels), JSON.stringify(c.restoreLabels));
      for (const shot of ['default', 'all-dismissed']) {
        const res = imageDiff(join(OUT, 'baseline', 'shots', `${id} ${shot}.png`), join(DIR, 'shots', `${id} ${shot}.png`));
        s.check(`${id}: screenshot (${shot}) identical`, res === 'same', res);
      }
    }
  }
  for (const id of Object.keys(record.pages)) if (!base.pages[id]) s.check(`${id}: new template (not in baseline)`, EXPECT.has(id));
  s.check('Library copy: saved-settings keys unchanged', JSON.stringify(record.library) === JSON.stringify(base.library), JSON.stringify({ before: base.library, now: record.library }));
  s.done();
}
