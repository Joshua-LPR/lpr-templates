// Landlord = a tenant field, matched from Buildium's Properties export (tenants.js).
// FAKE names and addresses only — tests/ is published with the site.
import { open } from './lib/cdp.mjs';
import { url, suite, openSetupTab } from './lib/site.mjs';

const s = suite('Landlord (tenant field from Properties CSV)');
const TENANTS = [
  'Id,First name,Last name,Street address line 1,Street address line 2,City/Locality,State/Province/Territory,Postal code',
  't1,Ann,Alpha,100 Test Avenue,,Testville,MD,21000',
  't2,Ben,Beta,200 Sample St.,Apt 2,Testville,MD,21000',
  't3,Cal,Gamma,300 Dup Rd,Rear,Testville,MD,21000',
  't4,Dee,Twin,400 Twin Ln,,Testville,MD,21000',
  't5,Eve,None,999 Nowhere Ct,,Testville,MD,21000',
  't6,Fay,Zip,100 Test Avenue,,Testville,MD,21999',
].join('\n');
const PROPS = [
  'Property name,Address 1,Address 2,Address 3,City/Locality,State/Province,Postal code,Building description,Id,Rental owners',
  'Test Avenue 100,100 TEST AVE.,,,Testville,MD,21000-1234,"Two-storey,\nmulti-line ""description""",p1,"Alpha Holdings, LLC"',
  'Sample 200,200 Sample Street,,,Testville,MD,21000,,p2,Beta Homes LLC',
  'Dup 300 rear,300 Dup Road,Rear,,Testville,MD,21000,,p3,Gamma LLC',
  'Dup 300,300 Dup Road,,,Testville,MD,21000,,p4,Delta LLC',
  'Twin 400 a,400 Twin Lane,,,Testville,MD,21000,,p5,Epsilon LLC',
  'Twin 400 b,400 Twin Lane,,,Testville,MD,21000,,p6,Zeta LLC',
].join('\n');
const WANT = { t1: 'Alpha Holdings, LLC', t2: 'Beta Homes LLC', t3: 'Gamma LLC', t4: '', t5: '', t6: '' };
const LANDLORDS = `(() => { const d = LPR_TENANTS.loadTenants(); return Object.fromEntries(Object.keys(d).map(k => [k, d[k].effective.landlord || ''])); })()`;
const RESET = `(() => { localStorage.removeItem('lpr_tenants'); localStorage.removeItem('lpr_properties'); })()`;

const t = await open(url('Letterhead.html'));
try {
  // Tenants first, then Properties.
  await t.eval(RESET);
  await t.eval(`LPR_TENANTS.importCSV(${JSON.stringify(TENANTS)})`);
  s.check('tenants imported before any Properties file: landlord blank', Object.values(await t.eval(LANDLORDS)).every(v => v === ''));
  const r = await t.eval(`LPR_TENANTS.importPropertiesCSV(${JSON.stringify(PROPS)})`);
  s.check('Properties import: 6 properties (multi-line quoted cells parsed), 3 matched, 1 ambiguous, 2 not found',
    r.properties === 6 && r.matched === 3 && r.ambiguous === 1 && r.unmatched === 2, JSON.stringify(r));
  const got = await t.eval(LANDLORDS);
  const bad = Object.keys(WANT).filter(k => got[k] !== WANT[k]).map(k => `${k}: "${got[k]}" want "${WANT[k]}"`);
  s.check('matching: Ave/Avenue, St./Street, Rd/Road, case, zip+4; "Alpha Holdings, LLC" kept whole; Address 2 settles 300 Dup; 400 Twin (2 owners) and wrong zip stay blank', !bad.length, bad.join('; '));

  // Properties first, then tenants → same result.
  await t.eval(RESET);
  await t.eval(`LPR_TENANTS.importPropertiesCSV(${JSON.stringify(PROPS)})`);
  await t.eval(`LPR_TENANTS.importCSV(${JSON.stringify(TENANTS)})`);
  const got2 = await t.eval(LANDLORDS);
  s.check('Properties imported first, then tenants: same landlords', Object.keys(WANT).every(k => got2[k] === WANT[k]), JSON.stringify(got2));

  // A landlord typed by hand wins and survives both re-imports.
  await t.eval(`(() => { const d = LPR_TENANTS.loadTenants(); d.t4.overrides = { landlord: 'Manual Owner LLC' }; d.t1.overrides = { landlord: 'Typed Over LLC' };
    localStorage.setItem('lpr_tenants', JSON.stringify(d)); })()`);
  await t.eval(`LPR_TENANTS.importPropertiesCSV(${JSON.stringify(PROPS)})`);
  await t.eval(`LPR_TENANTS.importCSV(${JSON.stringify(TENANTS)})`);
  const got3 = await t.eval(LANDLORDS);
  s.check('a landlord typed by hand wins and survives re-importing Properties and tenants', got3.t4 === 'Manual Owner LLC' && got3.t1 === 'Typed Over LLC' && got3.t2 === WANT.t2, JSON.stringify(got3));
  await t.eval(`(() => { const d = LPR_TENANTS.loadTenants(); d.t1.overrides = {}; localStorage.setItem('lpr_tenants', JSON.stringify(d)); })()`);
  await t.eval(`LPR_TENANTS.importPropertiesCSV(${JSON.stringify(PROPS)})`);

  // Tenants tab: the Landlord field + Properties button are there.
  await openSetupTab(t, 'Tenants');
  await t.eval(`document.querySelector('#lpr-fill-panel .lpr-tp-item[data-id="t1"]').click()`); await t.wait(300);
  const ui = await t.eval(`(() => { const p = document.getElementById('lpr-fill-panel'); return { btn: !!p.querySelector('#lpr-tp-props-file'),
    label: [...p.querySelectorAll('.lpr-tp-lbl')].some(l => l.textContent.trim() === 'Landlord'),
    value: [...p.querySelectorAll('input')].some(i => i.value === 'Alpha Holdings, LLC') }; })()`);
  s.check('Tenants tab: "↑ Properties" button; tenant shows an editable Landlord field with the matched owner', ui.btn && ui.label && ui.value, JSON.stringify(ui));

  // Picking a tenant fills {{landlord}} in the letter; the sign-off company does NOT change (LPR signs as agent).
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(400);
  await t.eval(`(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); const p = document.createElement('p'); p.id = 'zl'; p.textContent = 'Owner: {{landlord}}. Signed for {{sender company}}.'; b.querySelector('.signoff').before(p); })()`);
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(400);
  const ownerBefore = await t.eval(`[...document.querySelectorAll('.signoff [data-owner-field]')].map(e => e.textContent).join('|')`);
  await t.eval(`LPR_TENANTS.applyTenantAsRecipient(LPR_TENANTS.loadTenants().t1)`); await t.wait(200);
  const after = await t.eval(`({ landlord: (document.querySelector('#zl [data-tenant-field="landlord"]') || {}).textContent, sender: !!document.querySelector('#zl [data-owner-field="name"]'),
    owner: [...document.querySelectorAll('.signoff [data-owner-field]')].map(e => e.textContent).join('|') })`);
  s.check('picking the tenant fills {{landlord}} with their landlord', after.landlord === 'Alpha Holdings, LLC', JSON.stringify(after));
  s.check('{{sender company}} is the Sender (owner) field', after.sender);
  s.check('the sign-off company is NOT switched to the landlord', after.owner === ownerBefore, JSON.stringify({ ownerBefore, after: after.owner }));
  await t.eval(RESET);
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }
s.done();
