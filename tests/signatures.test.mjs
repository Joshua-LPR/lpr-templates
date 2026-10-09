// Signature options (signature-block.js) driven through the real Setup → Sender tab.
import { open } from './lib/cdp.mjs';
import { url, suite, openSetupTab, saveAs } from './lib/site.mjs';

const PAGE = process.argv[2] || 'Letterhead.html';
const s = suite('Signatures — ' + PAGE);
// A small visible PNG standing in for a gallery signature.
const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAAAHUlEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAA8GcQEAABlTTbswAAAABJRU5ErkJggg==';
const STATE = `(() => { const sg = document.querySelector('.signoff .signature'); const b = document.querySelector('.sig-block');
  return { img: !!sg.querySelector('img.lpr-sig-img'), line: !!sg.querySelector('.sig-row'), lineLabel: (sg.querySelector('.sig-label') || {}).textContent || '', empty: sg.innerHTML === '',
    signers: b ? b.querySelectorAll('.sig-signer').length : 0, leadin: !!document.querySelector('.sig-leadin'),
    names: b ? [...b.querySelectorAll('.sig-name')].map(n => n.textContent) : [], labels: b ? [...b.querySelectorAll('.sig-label')].map(n => n.textContent).join('/') : '',
    afterSignoff: b ? !!(b.previousElementSibling && b.previousElementSibling.classList.contains('signoff')) : null,
    pages: document.querySelectorAll('.stage > .sheet').length }; })()`;

const t = await open(url(PAGE));
async function apply(mode, tenants) {
  await openSetupTab(t, 'Sender');
  const ok = await t.eval(`(() => { const m = document.querySelector('[data-sigopt="mode"]'), n = document.querySelector('[data-sigopt="tenants"]'); if (!m || !n) return false;
    m.value = '${mode}'; n.value = '${tenants}'; document.getElementById('lpr-own-apply').click(); return true; })()`);
  await t.wait(200);
  return ok ? t.eval(STATE) : null;
}
try {
  await t.eval(`localStorage.setItem('lpr_signature', '${SIG}')`);
  await t.reload();
  await openSetupTab(t, 'Sender');
  s.check('Sender tab shows the two signature rows above Apply', await t.eval(`!!document.querySelector('[data-sigopt="mode"]') && !!document.querySelector('[data-sigopt="tenants"]') && !!document.getElementById('lpr-own-apply')`));
  const tabs = await t.eval(`[...document.querySelectorAll('#lpr-fill-panel button')].map(b => b.textContent.trim()).filter(x => /^(Sender|Tenants|Vendors|Fields|Options)$/.test(x))`);
  s.check('no separate Options tab', !tabs.includes('Options'), JSON.stringify(tabs));

  let st = await t.eval(STATE);
  s.check('Gallery default shows the gallery image', st.img && !st.line && !st.signers, JSON.stringify(st));
  st = await apply('blank', '0');
  s.check('Leave blank: nothing at all', st.empty, JSON.stringify(st));
  st = await apply('line', '0');
  s.check('Signature line: a Landlord/Agent Signature row, no image', st.line && !st.img && st.lineLabel === 'Landlord/Agent Signature', JSON.stringify(st));
  st = await apply('gallery', '0');
  s.check('back to Gallery default restores the image', st.img && !st.line);

  await t.eval(`document.querySelector('.recipient [data-contact-field="name"]').textContent = 'Jane Doe'`);
  st = await apply('gallery', '2');
  s.check('2 tenants rendered right after the sign-off, no lead-in', st.signers === 2 && st.afterSignoff && !st.leadin, JSON.stringify(st));
  s.check('tenant 1 name from the recipient; tenant 2 blank', st.names[0] === 'Jane Doe' && st.names[1] === '', JSON.stringify(st.names));
  s.check('labels: Tenant Signature / Date', st.labels === 'Tenant Signature/Date/Tenant Signature/Date', st.labels);

  st = await apply('line', '2');
  const geo = await t.eval(`(() => { const rows = [document.querySelector('.signature .sig-row'), document.querySelector('.sig-block .sig-row')];
    const lineX = rows.map(r => Math.round(r.querySelector('.sig-line').getBoundingClientRect().left));
    const nameX = [document.querySelector('.signature.sig-as-line ~ .signed-name'), document.querySelector('.sig-block .sig-name')].map(n => { const r = document.createRange(); r.selectNodeContents(n); return Math.round((r.getClientRects()[0] || n.getBoundingClientRect()).left); });
    return { pad: rows.map(r => getComputedStyle(r).paddingTop), date: rows.map(r => Math.round(r.querySelector('.sig-date').getBoundingClientRect().width)), lineX, nameX }; })()`);
  s.check('sender and tenant rows: same signing space and date-line width', geo.pad[0] === geo.pad[1] && geo.date[0] === geo.date[1], JSON.stringify(geo));
  s.check('every signature line starts at the same x', geo.lineX[0] === geo.lineX[1], JSON.stringify(geo.lineX));
  s.check('printed names sit under the line (sender and tenant)', Math.abs(geo.nameX[0] - geo.lineX[0]) <= 2 && Math.abs(geo.nameX[1] - geo.lineX[1]) <= 2, JSON.stringify(geo));

  await t.reload();
  st = await t.eval(STATE);
  s.check('settings persist per template after reload', st.line && st.signers === 2, JSON.stringify(st));

  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(250);
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(250);
  st = await apply('line', '1');
  s.check('after Edit on/off, the tenant setting still applies', st.signers === 1, JSON.stringify(st));

  await t.eval(`(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); LPR_FLOW.unpaginate(); b.querySelector('.signoff').insertAdjacentHTML('beforebegin', '<p>' + 'words here '.repeat(500) + '</p>'); LPR_FLOW.paginate(); })()`);
  st = await apply('line', '0');
  s.check('sign-off on page 2+: removing tenants works', st.signers === 0 && st.pages > 1, JSON.stringify(st));
  st = await apply('gallery', '2');
  s.check('sign-off on page 2+: adding tenants works', st.signers === 2 && st.pages > 1, JSON.stringify(st));
  s.check('tenant block and sign-off together on the last page', await t.eval(`(() => { const p = [...document.querySelectorAll('.stage > .sheet')].pop(); return !!p.querySelector('.sig-block') && !!p.querySelector('.signoff'); })()`));

  let bad = null, n = 0;
  for (let reps = 5; reps <= 34; reps += 1) {
    const r = await t.eval(`(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); LPR_FLOW.unpaginate(); b.querySelectorAll(':scope > p').forEach(p => p.remove());
      b.querySelector('.signoff').insertAdjacentHTML('beforebegin', Array.from({ length: 4 }, (_, k) => '<p>Para ' + k + ' ' + 'the payment plan schedule is '.repeat(${'${reps}'}) + '</p>').join('')); LPR_FLOW.paginate();
      const blk = document.querySelector('.sig-block'), so = document.querySelector('.signoff'); const kids = [...so.parentElement.children].filter(k => k.offsetParent);
      const i = kids.indexOf(so), prev = kids[i - 1];
      const over = [...document.querySelectorAll('.stage > .sheet')].map(x => { const bd = x.querySelector(':scope > .lh-body'); return Math.max(0, ...[...bd.children].filter(k => k.offsetParent).map(k => k.offsetTop + k.offsetHeight)) - bd.clientHeight; });
      return { together: blk.previousElementSibling === so, prevLines: prev && prev.tagName === 'P' ? Math.round(prev.offsetHeight / parseFloat(getComputedStyle(prev).lineHeight)) : (i === 0 ? 0 : 99), maxOver: Math.max(...over) }; })()`.replace('${reps}', reps));
    n++; if (!r.together || r.prevLines < 2 || r.maxOver > 1) bad = { reps, ...r };
  }
  s.check(`tenant block stays with sign-off; sign-off has ≥2 body lines; no overflow (${n} layouts)`, !bad, JSON.stringify(bad));

  // Library copy keeps its own settings even after the template's defaults change.
  await apply('line', '2');
  const id = await saveAs(t, 'Signature test');
  await apply('blank', '0');
  await t.goto(url('view.html', '?id=' + id));
  st = await t.eval(STATE);
  s.check('Library copy reopens exactly as saved (line + 2 tenants)', st.line && st.signers === 2, JSON.stringify(st));
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); s.done(); }
