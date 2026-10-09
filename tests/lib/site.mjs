// Site-specific helpers shared by every test file.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// tests/out holds ONLY the baseline records (needed between capture and
// compare). Everything else a test writes goes to ARTIFACTS, a temp folder
// deleted when the test process ends — nothing else is kept on the PC.
export const OUT = join(REPO, 'tests', 'out');
mkdirSync(OUT, { recursive: true });
export const ARTIFACTS = mkdtempSync(join(tmpdir(), 'lpr-test-artifacts-'));
process.on('exit', () => { try { rmSync(ARTIFACTS, { recursive: true, force: true }); } catch {} });

export const url = (rel, query = '') => pathToFileURL(join(REPO, rel)).href + query;

// Every template in the manifest (the index/archive registry).
export function templates() {
  global.window = {};
  const require = createRequire(import.meta.url);
  const p = join(REPO, 'templates-manifest.js');
  delete require.cache[p];
  require(p);
  const list = window.LPR_MANIFEST.map(t => ({ id: t.id, modes: (t.modes || []).map(m => m.id), flags: t.flags || {} }));
  delete global.window;
  return list;
}
export const APP_PAGES = ['index.html', 'archive.html', 'users.html', 'style-guide.html'];

// ---- reporting --------------------------------------------------------
export function suite(name) {
  const rows = [];
  const check = (label, ok, info = '') => {
    rows.push({ ok: !!ok, label, info });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info && !ok ? '  — ' + String(info).slice(0, 600) : ''}`);
  };
  console.log(`\n=== ${name} ===`);
  return {
    check,
    crash(e) { check('no crash', false, e && (e.stack || e.message || e)); },
    done() {
      const failed = rows.filter(r => !r.ok).length;
      console.log(`--- ${name}: ${rows.length - failed}/${rows.length} passed`);
      process.exitCode = failed ? 1 : (process.exitCode || 0);
      return failed;
    }
  };
}

// ---- in-page helpers (run with t.eval) --------------------------------
export const JS = {
  clickButton: label => `(() => { const b = [...document.querySelectorAll('button, .tt-btn')].find(b => b.textContent.trim() === ${JSON.stringify(label)}); if (b) b.click(); return !!b; })()`,
  continueDialog: `(() => { const b = [...document.querySelectorAll('.tt-backdrop button')].find(b => /continue/i.test(b.textContent)); if (b) b.click(); return !!b; })()`,
  hookBlobs: `(() => { if (window.__blobs) return; window.__blobs = []; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = b => { if (b instanceof Blob) __blobs.push(b); return o(b); }; })()`,
  readBlobs: `(async () => Promise.all((window.__blobs || []).map(async b => { const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let k = 0; k < u.length; k += 32768) s += String.fromCharCode.apply(null, u.subarray(k, k + 32768)); return { type: b.type, size: b.size, b64: btoa(s) }; })))()`,
  sheets: `document.querySelectorAll('.stage > .sheet').length`,
};

export async function openSetupTab(t, tab) {
  await t.eval(`(() => { if (!document.getElementById('lpr-fill-panel') || getComputedStyle(document.getElementById('lpr-fill-panel')).display === 'none') ${JS.clickButton('Setup')}; })()`);
  await t.wait(350);
  const ok = await t.eval(`(() => { const b = [...document.querySelectorAll('#lpr-fill-panel button')].find(b => b.textContent.trim() === ${JSON.stringify(tab)}); if (b) b.click(); return !!b; })()`);
  await t.wait(350);
  return ok;
}

// Export via the toolbar menu; returns captured blobs [{type,size,buf}].
export async function exportAs(t, kind, settle = 7000) {
  await t.eval(JS.hookBlobs);
  const before = await t.eval('window.__blobs.length');
  await t.eval(`document.getElementById('tt-export-btn').click()`);
  await t.wait(150);
  await t.eval(`document.querySelector('.tt-menu-item[data-export="${kind}"]').click()`);
  await t.wait(700);
  await t.eval(JS.continueDialog);
  await t.wait(settle);
  const all = await t.eval(JS.readBlobs);
  return all.slice(before).map(b => ({ type: b.type, size: b.size, buf: Buffer.from(b.b64, 'base64') }));
}

// Save As through the real dialogs; returns the new library entry id.
export async function saveAs(t, name) {
  await t.eval(JS.clickButton('Save As'));
  await t.wait(500);
  for (let k = 0; k < 4; k++) {
    if (await t.eval(`!!document.querySelector('.tt-modal-input')`)) break;
    await t.eval(JS.continueDialog);
    await t.wait(400);
  }
  await t.eval(`(() => { document.querySelector('.tt-modal-input').value = ${JSON.stringify(name)}; document.querySelector('.tt-backdrop [data-act="ok"]').click(); })()`);
  await t.wait(700);
  await t.eval(`(() => { const b = document.querySelector('.tt-backdrop [data-act="cancel"]'); if (b) b.click(); })()`); // "go to index?" → stay
  return t.eval(`(() => { const s = JSON.parse(localStorage.getItem('lpr_custom_templates') || '{}'); const e = Object.values(s).filter(x => x.name === ${JSON.stringify(name)}).pop(); return e ? e.id : null; })()`);
}

export const savedHtml = (t, id) => t.eval(`JSON.parse(localStorage.getItem('lpr_custom_templates'))[${JSON.stringify(id)}].html`);

export const pdfPageCount = buf => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

export const readJson = p => JSON.parse(readFileSync(p, 'utf-8'));
