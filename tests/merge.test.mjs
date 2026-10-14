// Mail merge (merge.js): one copy per tenant on Letterhead, Notice Template,
// envelopes. FAKE names and addresses only — tests/ is published.
import { open } from './lib/cdp.mjs';
import { url, suite, openSetupTab, exportAs, pdfPageCount } from './lib/site.mjs';

const s = suite('Mail merge');
const TENANTS = [
  'Id,First name,Last name,Street address line 1,Street address line 2,City/Locality,State/Province/Territory,Postal code',
  'm1,Ann,Alpha,100 Test Avenue,Apt 1,Testville,MD,21000',
  'm2,Ben,Beta,100 Test Avenue,Apt 2,Testville,MD,21000',
  'm3,Cal,Gamma,200 Other Road,,Otherton,MD,21001',
].join('\n');
const SETUP = `(() => { localStorage.removeItem('lpr_tenants'); localStorage.removeItem('lpr_properties'); LPR_TENANTS.importCSV(${JSON.stringify(TENANTS)}); })()`;
const VISIBLE = `[...document.querySelectorAll('.stage > .sheet')].filter(s => s.offsetHeight > 0)`;
const pick = async (t, how) => {           // open the picker through the real Tenants tab button
  await openSetupTab(t, 'Tenants');
  await t.eval(`document.getElementById('lpr-tp-merge').click()`); await t.wait(200);
  return t.eval(how);
};

// ---- Letterhead: long letter, 3 tenants, building filter ------------------
const t = await open(url('Letterhead.html'));
try {
  await t.eval(SETUP);
  await t.eval(`localStorage.setItem('lpr_fill_' + LPR_UTIL.pageKey(), JSON.stringify({ date: '2026-10-08' }))`);
  await t.reload(2500);
  // A letter long enough for 2 pages, so each copy must paginate on its own.
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(300);
  await t.eval(`(() => { const so = document.querySelector('.sheet[data-flow] .lh-body .signoff'); for (let i = 0; i < 30; i++) { const p = document.createElement('p'); p.textContent = 'Paragraph ' + i + ' of a long merged letter that needs a second page to finish.'; so.before(p); } })()`);
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(800);
  const pagesBefore = await t.eval(`${VISIBLE}.length`);
  s.check('setup: the letter is 2+ pages before merging', pagesBefore >= 2, 'pages=' + pagesBefore);

  const dlg = await pick(t, `(() => { const d = document.querySelector('.lpr-merge-dlg'); return { open: !!d, bldgs: [...d.querySelectorAll('.lpr-merge-bldg option')].map(o => o.value).filter(Boolean),
    rows: d.querySelectorAll('.lpr-merge-row').length }; })()`);
  const fit = await t.eval(`(() => { const p = document.getElementById('lpr-fill-panel').getBoundingClientRect(); return [...document.querySelectorAll('.lpr-tp-import-row > button, .lpr-tp-import-row > label, #lpr-tp-merge')].filter(e => { const r = e.getBoundingClientRect(); return !(r.width > 0 && r.right <= p.right + 0.5); }).map(e => e.textContent.trim()); })()`);
  s.check('every Tenants-tab button (incl. Mail merge) is fully visible in the panel', !fit.length, JSON.stringify(fit));
  s.check('Tenants tab → Mail merge opens the picker: all 3 tenants, building filter lists the 2 buildings', dlg.open && dlg.rows === 3 && dlg.bldgs.join('|') === '100 Test Avenue|200 Other Road', JSON.stringify(dlg));
  const filt = await t.eval(`(() => { const d = document.querySelector('.lpr-merge-dlg'); const b = d.querySelector('.lpr-merge-bldg'); b.value = '100 Test Avenue'; b.dispatchEvent(new Event('change'));
    const all = d.querySelector('.lpr-merge-all'), lbl = () => d.querySelector('.lpr-merge-all-lbl').textContent;
    const r = { rows: d.querySelectorAll('.lpr-merge-row').length, lbl0: lbl() };
    all.click(); r.count = d.querySelector('.lpr-merge-count').textContent; r.checked = all.checked; r.lbl1 = lbl();
    const c = d.querySelector('.lpr-merge-row input'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); r.partial = all.indeterminate;
    all.click(); r.refilled = d.querySelector('.lpr-merge-count').textContent;
    all.click(); r.cleared = d.querySelector('.lpr-merge-count').textContent; r.unchecked = !all.checked && !all.indeterminate;
    all.click();   // leave the 2 selected for the next step
    return r; })()`);
  s.check('building filter → 2 tenants; the header checkbox selects all shown ("Select all 2 shown" → "Deselect all")', filt.rows === 2 && /^2 selected/.test(filt.count) && filt.checked && /^Select all 2 shown/.test(filt.lbl0) && /^Deselect all/.test(filt.lbl1), JSON.stringify(filt));
  s.check('header checkbox: a dash when only some are selected; click → all; click again → none', filt.partial && /^2 selected/.test(filt.refilled) && /^0 selected/.test(filt.cleared) && filt.unchecked, JSON.stringify(filt));
  await t.eval(`(() => { const d = document.querySelector('.lpr-merge-dlg'); const b = d.querySelector('.lpr-merge-bldg'); b.value = ''; b.dispatchEvent(new Event('change'));
    const q = d.querySelector('.lpr-merge-q'); q.value = 'gamma'; q.dispatchEvent(new Event('input'));
    const c = d.querySelector('.lpr-merge-row input'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true }));
    d.querySelector('[data-act="go"]').click(); })()`);
  await t.wait(1200);
  const m = await t.eval(`(() => { const copies = [...document.querySelectorAll('.lpr-merge-copy:not(.flow-page)')];
    return { copies: copies.length, names: copies.map(c => (c.querySelector('.recipient [data-contact-field="name"]') || {}).textContent),
      sheets: ${VISIBLE}.length, origHidden: getComputedStyle(document.querySelector('.lpr-merge-hidden')).display === 'none',
      dates: copies.map(c => (c.querySelector('.date [data-fill-field]') || {}).textContent),
      heads: [...document.querySelectorAll('.flow-page')].filter(p => p.offsetHeight).map(p => (p.querySelector('.flow-head, .flow-cont, [class*="flow-head"]') || p).textContent.replace(/\\s+/g, ' ').trim().slice(0, 80)),
      edit: getComputedStyle(document.getElementById('tt-edit-btn')).display, save: [...document.querySelectorAll('.tt-btn')].filter(b => b.textContent.trim() === 'Save As').map(b => getComputedStyle(b).display).join(),
      bar: !!document.getElementById('lpr-merge-bar'), setup: getComputedStyle(document.getElementById('lpr-fill-btn')).display,
      panel: document.getElementById('lpr-fill-panel') ? getComputedStyle(document.getElementById('lpr-fill-panel')).display : 'none' }; })()`);
  s.check('3 copies, one per tenant, in last-name order, each with its own recipient', m.copies === 3 && m.names.join('|') === 'Ann Alpha|Ben Beta|Cal Gamma', JSON.stringify(m.names));
  s.check('each copy paginates on its own (3 × the single letter\'s pages); original hidden', m.sheets === 3 * pagesBefore && m.origHidden, JSON.stringify({ sheets: m.sheets, pagesBefore }));
  s.check('continuation headings name each copy\'s own tenant', ['Ann Alpha', 'Ben Beta', 'Cal Gamma'].every(n => m.heads.some(h => h.includes(n))), JSON.stringify(m.heads));
  s.check('shared Fields-tab value (date) identical on every copy', m.dates.length === 3 && m.dates.every(d => d === 'October 8, 2026'), JSON.stringify(m.dates));
  s.check('merge bar shown; Edit, Save As and Setup hidden while merging (a tenant pick would change every copy)', m.bar && m.edit === 'none' && m.save === 'none' && m.setup === 'none' && m.panel === 'none', JSON.stringify({ edit: m.edit, save: m.save, setup: m.setup, panel: m.panel }));
  const printed = await t.printPdf();
  s.check('print = every copy\'s pages, nothing else', printed === m.sheets, `print ${printed} vs sheets ${m.sheets}`);
  const pdf = await exportAs(t, 'pdf', 12000);
  const pdfPages = pdf.length ? pdfPageCount(pdf[0].buf) : 0;
  s.check('Export → PDF: one file with all copies', pdf.length === 1 && pdfPages === m.sheets, `files ${pdf.length}, pages ${pdfPages}`);

  await t.eval(`document.querySelector('#lpr-merge-bar [data-act="exit"]').click()`); await t.wait(800);
  const after = await t.eval(`({ copies: document.querySelectorAll('.lpr-merge-copy').length, sheets: ${VISIBLE}.length, bar: !!document.getElementById('lpr-merge-bar'),
    edit: getComputedStyle(document.getElementById('tt-edit-btn')).display, flow: document.querySelectorAll('.sheet[data-flow]').length })`);
  s.check('Exit merge: copies gone, single letter back (same pages), Edit back', after.copies === 0 && after.sheets === pagesBefore && !after.bar && after.edit !== 'none' && after.flow === 1, JSON.stringify(after));
  await t.eval(`(() => { localStorage.removeItem('lpr_tenants'); localStorage.removeItem('lpr_fill_' + LPR_UTIL.pageKey()); })()`);
  s.check('no console errors', t.logs.filter(l => !/^dialog beforeunload/.test(l)).length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }

// ---- Envelope + Notice Template: 2 copies each -----------------------------
for (const page of ['Envelope.html', 'Notice Template.html', 'Envelope Premium.html', '24-Hour Notice.html']) {
  const e = await open(url(page));
  try {
    await e.eval(SETUP); await e.reload(2500);
    await pick(e, `(() => { const d = document.querySelector('.lpr-merge-dlg'); [...d.querySelectorAll('.lpr-merge-row input')].slice(0, 2).forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }); d.querySelector('[data-act="go"]').click(); })()`);
    await e.wait(800);
    const r = await e.eval(`({ copies: [...document.querySelectorAll('.lpr-merge-copy:not(.flow-page)')].map(c => [...c.querySelectorAll('[data-contact-field="name"], [data-contact-field="first_name"]')].map(x => x.textContent).filter(Boolean)[0] || ''), sheets: ${VISIBLE}.length })`);
    const pages = await e.printPdf();
    s.check(`${page.replace('.html', '')}: 2 copies with each tenant's name; prints 2 pages`, r.copies.length === 2 && /Alpha|Ann/.test(r.copies[0]) && /Beta|Ben/.test(r.copies[1]) && pages === r.sheets && r.sheets === 2, JSON.stringify({ r, pages }));
    await e.eval(`LPR_MERGE.exit()`); await e.wait(300);
    s.check(`${page.replace('.html', '')}: Exit restores one page`, (await e.eval(`${VISIBLE}.length`)) === 1);
    await e.eval(`localStorage.removeItem('lpr_tenants')`);
    s.check(`${page.replace('.html', '')}: no console errors`, e.logs.length === 0, e.logs.join(' || '));
  } catch (err) { s.crash(err); }
  finally { await e.close(); }
}

// ---- Not offered on individualized notices ----------------------------------
const x = await open(url('Rent Increase Notice.html'));
try {
  await openSetupTab(x, 'Tenants');
  s.check('Rent Increase (individualized, later phase): no Merge button', !(await x.eval(`!!document.getElementById('lpr-tp-merge')`)));
} catch (e) { s.crash(e); }
finally { await x.close(); }
s.done();
