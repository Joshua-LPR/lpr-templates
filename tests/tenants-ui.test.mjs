// Tenants tab (2026-10-14): landlord is a dropdown of the owners list with
// "+ New owner…"; current vs past from the latest tenant import; the merge
// picker's Current / All filter + import note. FAKE data only.
import { open } from './lib/cdp.mjs';
import { url, suite, openSetupTab } from './lib/site.mjs';

const s = suite('Tenants tab: landlord dropdown + current vs past');
const HEAD = 'Id,First name,Last name,Street address line 1,Street address line 2,City/Locality,State/Province/Territory,Postal code';
const CSV1 = [HEAD, 'k1,Ann,Alpha,100 Test Avenue,,Testville,MD,21000', 'k2,Ben,Beta,200 Sample St,,Testville,MD,21000', 'k3,Cal,Gamma,300 Other Rd,,Testville,MD,21000'].join('\n');
const CSV2 = [HEAD, 'k1,Ann,Alpha,100 Test Avenue,,Testville,MD,21000', 'k2,Ben,Beta,200 Sample St,,Testville,MD,21000'].join('\n');   // Cal moved out
const PROPS = ['Address 1,Address 2,Postal code,Rental owners', '100 Test Ave,,21000,Alpha Holdings LLC'].join('\n');
const RESET = `['lpr_tenants','lpr_properties','lpr_owners','lpr_owners_manual','lpr_tenants_import'].forEach(k => localStorage.removeItem(k))`;

const t = await open(url('Letterhead.html'));
try {
  await t.eval(RESET);
  await t.eval(`LPR_TENANTS.importPropertiesCSV(${JSON.stringify(PROPS)}); localStorage.setItem('lpr_owners', JSON.stringify(['LPR Management, LLC', 'Sender Csv Owner LLC']))`);
  await t.reload(2500);

  // ---- + Add: landlord dropdown ----
  await openSetupTab(t, 'Tenants');
  await t.eval(`document.getElementById('lpr-tp-add').click()`); await t.wait(300);
  const lay = await t.eval(`(() => { const p = document.getElementById('lpr-fill-panel'), f = p.querySelector('.lpr-tp-fields');
    return { btn: document.getElementById('lpr-tp-add').textContent.trim(), hd: p.querySelector('.lpr-tp-ed-hd').textContent.trim(), list: !!p.querySelector('.lpr-tp-list, .lpr-tp-recent, #lpr-tp-q'), formH: f.getBoundingClientRect().height }; })()`);
  s.check('"+ Add Manually" opens "Add New Tenant" with the whole panel (search, recent and list hidden)', lay.btn === '+ Add Manually' && lay.hd === 'Add New Tenant' && !lay.list && lay.formH > 250, JSON.stringify(lay));
  const dd = await t.eval(`(() => { const s = document.querySelector('#lpr-fill-panel select.lpr-tp-landlord'); const inp = document.querySelector('#lpr-fill-panel input[data-field="landlord"]');
    return { select: !!s, textInput: !!inp, opts: s ? [...s.options].map(o => o.textContent) : [] }; })()`);
  s.check('+ Add: Landlord is a dropdown (no free-text box) of the owners list: LPR, owners CSV, Properties owners, then "+ New owner…"',
    dd.select && !dd.textInput && dd.opts.includes('Alpha Holdings LLC') && dd.opts.includes('Sender Csv Owner LLC') && dd.opts.includes('LPR Management, LLC') && dd.opts[dd.opts.length - 1] === '+ New owner…', JSON.stringify(dd));
  await t.eval(`(() => { const s = document.querySelector('#lpr-fill-panel select.lpr-tp-landlord'); s.value = '__new'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await t.wait(100);
  const box = await t.eval(`(() => { const s = document.querySelector('#lpr-fill-panel select.lpr-tp-landlord'); return { open: !s.nextElementSibling.hidden, value: s.value }; })()`);
  s.check('"+ New owner…" opens a name box (and isn\'t itself chosen)', box.open && box.value !== '__new', JSON.stringify(box));
  await t.eval(`(() => { const b = document.querySelector('#lpr-fill-panel .lpr-tp-newowner'); b.querySelector('input').value = 'Hand Added Owner LLC'; b.querySelector('button').click();
    const f = n => document.querySelector('#lpr-fill-panel .lpr-tp-new-inp[data-field="' + n + '"]'); f('first_name').value = 'Dee'; f('last_name').value = 'Delta';
    document.getElementById('lpr-tp-new-save').click(); })()`);
  await t.wait(300);
  const saved = await t.eval(`(() => { const d = LPR_TENANTS.loadTenants(); const x = Object.values(d).find(t => t.source.last_name === 'Delta'); return { landlord: x && x.effective.landlord, inList: LPR_UTIL.ownerList().includes('Hand Added Owner LLC') }; })()`);
  s.check('new owner is selected, saved on the tenant, and joins the owners list', saved.landlord === 'Hand Added Owner LLC' && saved.inList, JSON.stringify(saved));
  await t.eval(`localStorage.setItem('lpr_owners', JSON.stringify(['LPR Management, LLC', 'Other Csv Owner LLC']))`);   // owners CSV re-imported
  s.check('a hand-added owner survives an owners-CSV re-import', await t.eval(`LPR_UTIL.ownerList().includes('Hand Added Owner LLC')`));
  await openSetupTab(t, 'Sender');
  s.check('Sender tab owner list includes the hand-added owner', await t.eval(`!!document.querySelector('#lpr-fill-panel .lpr-own-item[data-name="Hand Added Owner LLC"]')`));

  // ---- Editor: dropdown saves like any edit ----
  await t.eval(`LPR_TENANTS.importCSV(${JSON.stringify(CSV1)})`);
  await openSetupTab(t, 'Tenants');
  await t.eval(`document.querySelector('#lpr-fill-panel .lpr-tp-item[data-id="k2"]').click()`); await t.wait(300);
  await t.eval(`(() => { const s = document.querySelector('#lpr-fill-panel select.lpr-tp-landlord'); s.value = 'Alpha Holdings LLC'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await t.wait(150);
  s.check('tenant editor: choosing a landlord from the dropdown saves it', (await t.eval(`LPR_TENANTS.loadTenants().k2.effective.landlord`)) === 'Alpha Holdings LLC');

  // ---- Recent list: capped at 5, and its block scrolls so the editor keeps room ----
  await t.eval(`localStorage.setItem('lpr_recent_tenants', JSON.stringify(['k1','k2','k3','k1','k2','k3','k1','x6','x7']))`);
  await openSetupTab(t, 'Tenants'); await t.eval(`document.querySelector('#lpr-fill-panel .lpr-tp-list .lpr-tp-item[data-id="k1"]').click()`); await t.wait(300);
  const rec = await t.eval(`(() => { const p = document.getElementById('lpr-fill-panel'); return { n: p.querySelectorAll('.lpr-tp-recent .lpr-tp-item').length, recentH: p.querySelector('.lpr-tp-recent').getBoundingClientRect().height, edH: p.querySelector('.lpr-tp-fields').getBoundingClientRect().height }; })()`);
  s.check('recent list shows each tenant once, at most 5, and its block ≤ 150px, so the tenant editor keeps room', rec.n <= 5 && rec.recentH <= 152, JSON.stringify(rec));

  // ---- Current vs past ----
  const r2 = await t.eval(`LPR_TENANTS.importCSV(${JSON.stringify(CSV2)})`);
  s.check('re-import without Cal: nobody deleted; 1 reported as past', r2.total >= 3 && r2.past === 1, JSON.stringify(r2));
  const cur = await t.eval(`(() => { const d = LPR_TENANTS.loadTenants(); return { k1: LPR_TENANTS.isCurrent(d.k1), k3: LPR_TENANTS.isCurrent(d.k3), manual: LPR_TENANTS.isCurrent(Object.values(d).find(t => t._manual)) }; })()`);
  s.check('current = in the latest import; hand-added tenants count as current', cur.k1 && !cur.k3 && cur.manual, JSON.stringify(cur));
  await t.reload(2500); await openSetupTab(t, 'Tenants');
  s.check('Tenants list tags the moved-out tenant "past"', await t.eval(`!!document.querySelector('#lpr-fill-panel .lpr-tp-item[data-id="k3"] .lpr-tp-past') && !document.querySelector('#lpr-fill-panel .lpr-tp-item[data-id="k1"] .lpr-tp-past')`));
  await t.eval(`document.getElementById('lpr-tp-merge').click()`); await t.wait(300);
  const pk = await t.eval(`(() => { const d = document.querySelector('.lpr-merge-dlg'); const names = () => [...d.querySelectorAll('.lpr-merge-name')].map(n => n.textContent);
    const a = names(); const sc = d.querySelector('.lpr-merge-scope'); sc.value = 'all'; sc.dispatchEvent(new Event('change')); const b = names();
    const note = d.querySelector('.lpr-merge-note'); return { current: a, all: b, note: note.textContent, stale: note.classList.contains('stale') }; })()`);
  s.check('merge picker: "Current tenants" (default) leaves out the moved-out tenant; "All" includes them',
    !pk.current.includes('Gamma, Cal') && pk.current.includes('Alpha, Ann') && pk.all.includes('Gamma, Cal'), JSON.stringify(pk));
  s.check('merge picker note: date + count of the last import and the reminder to import the latest export', /Current = the 2 tenants in the tenant list imported/.test(pk.note) && /Import the latest Buildium tenant export/.test(pk.note) && !pk.stale, pk.note);
  await t.eval(`localStorage.setItem('lpr_tenants_import', JSON.stringify(Object.assign(LPR_TENANTS.importInfo(), { id: Date.now() - 20 * 86400000 })))`);
  await t.eval(`document.querySelector('.lpr-merge-dlg [data-act="cancel"]').click(); document.getElementById('lpr-tp-merge').click()`); await t.wait(300);
  s.check('note turns amber when the tenant import is over 2 weeks old', await t.eval(`document.querySelector('.lpr-merge-note').classList.contains('stale')`));
  await t.eval(`document.querySelector('.lpr-merge-dlg [data-act="cancel"]').click()`);

  // ---- Buildium's Status column (AG): "Former Tenant" is past even when in the file ----
  const CSV3 = [HEAD + ',Status', 'k1,Ann,Alpha,100 Test Avenue,,Testville,MD,21000,Tenant', 'k2,Ben,Beta,200 Sample St,,Testville,MD,21000,Former Tenant'].join('\n');
  const r3 = await t.eval(`LPR_TENANTS.importCSV(${JSON.stringify(CSV3)})`);
  const st = await t.eval(`(() => { const d = LPR_TENANTS.loadTenants(); return { k1: LPR_TENANTS.isCurrent(d.k1), k2: LPR_TENANTS.isCurrent(d.k2), k3: LPR_TENANTS.isCurrent(d.k3), count: LPR_TENANTS.importInfo().count }; })()`);
  s.check('Status "Former Tenant" → past even though it is in the file; "Tenant" → current', st.k1 && !st.k2 && !st.k3 && st.count === 1, JSON.stringify({ st, r3 }));

  // ---- "Former tenant" checkbox ----
  await t.reload(2500); await openSetupTab(t, 'Tenants');
  await t.eval(`document.getElementById('lpr-tp-add').click()`); await t.wait(300);
  await t.eval(`(() => { const f = n => document.querySelector('#lpr-fill-panel .lpr-tp-new-inp[data-field="' + n + '"]'); f('first_name').value = 'Eve'; f('last_name').value = 'Echo';
    document.getElementById('lpr-tp-new-former').checked = true; document.getElementById('lpr-tp-new-save').click(); })()`); await t.wait(300);
  s.check('+ Add with "Former tenant" ticked → saved as former (past)', await t.eval(`!LPR_TENANTS.isCurrent(Object.values(LPR_TENANTS.loadTenants()).find(t => t.source.last_name === 'Echo'))`));
  await t.eval(`document.querySelector('#lpr-fill-panel .lpr-tp-item[data-id="k1"]').click()`); await t.wait(300);
  await t.eval(`(() => { const c = document.getElementById('lpr-tp-former-cb'); c.checked = true; c.dispatchEvent(new Event('change')); })()`); await t.wait(300);
  const tick = await t.eval(`({ cur: LPR_TENANTS.isCurrent(LPR_TENANTS.loadTenants().k1), tag: !!document.querySelector('#lpr-fill-panel .lpr-tp-item[data-id="k1"] .lpr-tp-past') })`);
  s.check('editor: ticking "Former tenant" makes a current tenant past (and tagged)', !tick.cur && tick.tag, JSON.stringify(tick));
  await t.eval(`(() => { const c = document.getElementById('lpr-tp-former-cb'); c.checked = false; c.dispatchEvent(new Event('change')); })()`); await t.wait(300);
  s.check('unticking puts them back to current, and the override clears (matches Buildium again)', await t.eval(`(() => { const k = LPR_TENANTS.loadTenants().k1; return LPR_TENANTS.isCurrent(k) && !('former' in k); })()`));
  await t.eval(RESET);
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }
s.done();
