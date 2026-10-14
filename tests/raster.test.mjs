// PDF / PNG exports go through html2canvas, which renders its OWN copy of the
// page (screen CSS, ::before/::after turned into real nodes). Regression from
// a real Occupant Update PDF (2026-10-14): the empty Apt fragment came back as
// ", ______," and the roster grid shifted one cell. Measures html2canvas's
// copy itself (onclone) during a real Export → PDF. FAKE data only.
import { open } from './lib/cdp.mjs';
import { url, suite, exportAs } from './lib/site.mjs';

const s = suite('Raster exports (PDF/PNG) keep the print layout');

// Wrap html2canvas the moment the export loads it, and record layout facts
// from the clone it is about to draw.
const HOOK = `(() => { if (window.__h2cHooked) return; window.__h2cHooked = true; window.__h2c = [];
  let real; Object.defineProperty(window, 'html2canvas', { configurable: true, get: () => real && wrapped, set: v => { real = v; } });
  function wrapped(el, opts) { opts = Object.assign({}, opts); const prev = opts.onclone;
    opts.onclone = doc => { const r = {};
      const a2 = doc.querySelector('.addr2-inline'); r.addr2Shown = !!a2 && doc.defaultView.getComputedStyle(a2).display !== 'none';
      const cells = [...doc.querySelectorAll('.occ-grid > *')].filter(c => doc.defaultView.getComputedStyle(c).display !== 'none');
      const box = c => c.getBoundingClientRect();
      const head = [...doc.querySelectorAll('.occ-head')].map(box), occ = [...doc.querySelectorAll('.occ-cell[data-opt-row="occ1"]')].map(box);
      r.grid = head.length === 2 && occ.length === 2 && Math.abs(head[0].left - occ[0].left) < 2 && Math.abs(head[1].left - occ[1].left) < 2 && occ[0].top > head[0].top;
      r.cells = cells.length; window.__h2c.push(r); if (prev) return prev(doc); };
    return real(el, opts); } })()`;

const t = await open(url('Occupant Update.html'));
try {
  await t.eval(`(() => { const v = { name: 'Test Person', address_line1: '100 Test Avenue', address_line2: '', city: 'Testville', state: 'MD', zip: '21000' };
    document.querySelectorAll('[data-contact-field]').forEach(e => { e.textContent = v[e.dataset.contactField] || ''; });
    const f = l => document.querySelector('[data-fill-label="' + l + '"]');
    f('Occupant 1 Name').textContent = 'Sample Occupant'; f('Occupant 1 Date of Birth').textContent = '1/2/1960'; })()`);
  // Occupant 2 is unused but left on the page (blank write-in row), 3-4 start dismissed.
  await t.eval(HOOK);
  const before = await t.eval(`document.querySelector('.addr2-inline').getBoundingClientRect().width`);
  s.check('on screen the empty Apt fragment is collapsed', before === 0, before);
  const out = await exportAs(t, 'pdf');
  const rec = await t.eval('window.__h2c');
  s.check('Export → PDF produced a PDF', out.some(b => b.type === 'application/pdf'));
  s.check('html2canvas was used and its copy was measured', rec.length > 0, JSON.stringify(rec));
  s.check('PDF: empty Apt fragment stays collapsed (no ", ____," in the address)', rec.length && rec.every(r => !r.addr2Shown), JSON.stringify(rec));
  s.check('PDF: roster grid keeps its columns (Name under NAME, DOB under DATE OF BIRTH)', rec.length && rec.every(r => r.grid), JSON.stringify(rec));
  const after = await t.eval(`({ btn: getComputedStyle(document.querySelector('.opt-dismiss[data-opt-row="occ1"]')).visibility, a2: document.querySelector('.addr2-inline').style.cssText })`);
  s.check('page restored after export (dismiss buttons visible, no inline styles left)', after.btn === 'visible' && after.a2 === '', JSON.stringify(after));
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }
s.done();
