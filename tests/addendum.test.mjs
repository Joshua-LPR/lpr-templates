// Utilities Addendum on the shared full-size signature rows (bead 9vg; chart
// condensed 2026-10-10 to make room): defaults to a Landlord/Agent signature
// LINE + 1 tenant line, capped at 1 tenant (data-sig-max-tenants) — 2 don't fit.
// "Fits" is measured as real overflow — the sheet clips (overflow:hidden), so a
// PDF page count alone would hide signatures pushed off the page.
import { open } from './lib/cdp.mjs';
import { url, suite, openSetupTab } from './lib/site.mjs';

const s = suite('Utilities Addendum — signature rows');
const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAAAHUlEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAA8GcQEAABlTTbswAAAABJRU5ErkJggg==';
const STATE = `(() => { const sg = document.querySelector('.signoff .signature'); const b = document.querySelector('.sig-block');
  const sh = document.querySelector('.sheet'); const r = sh.getBoundingClientRect(); const last = [...sh.children].pop().getBoundingClientRect();
  return { senderLine: (sg.querySelector('.sig-label') || {}).textContent || '', img: !!sg.querySelector('img'),
    tenants: b ? [...b.querySelectorAll('.sig-label:not(.sig-date-label)')].map(l => l.textContent) : [],
    oldRows: !!document.querySelector('.ua-sign'), spare: Math.round(r.bottom - parseFloat(getComputedStyle(sh).paddingBottom) - last.bottom) }; })()`;
const t = await open(url('Utilities Addendum.html'));
const KEY = await t.eval('"lpr_sigopt_" + LPR_UTIL.fileKey()');
try {
  for (const mode of ['full', 'simple']) {
    await t.eval(`localStorage.removeItem(${JSON.stringify(KEY)})`); await t.reload(2500);
    if (mode === 'simple') { await t.eval(`document.querySelector('.mode-btn[data-mode="simple"]').click()`); await t.wait(200); }
    const st = await t.eval(STATE);
    s.check(`${mode}: defaults — Landlord/Agent signature LINE + 1 Tenant line; old local rows gone`,
      st.senderLine === 'Landlord/Agent Signature' && !st.img && st.tenants.join('/') === 'Tenant Signature' && !st.oldRows, JSON.stringify(st));
    s.check(`${mode}: fits on the page (nothing pushed off)`, st.spare >= 0, 'spare px=' + st.spare);
  }
  // Every sender choice fits — incl. a gallery signature image.
  await t.eval(`localStorage.setItem('lpr_signature', '${SIG}')`);
  for (const m of ['gallery', 'blank', 'line']) {
    await t.eval(`localStorage.setItem(${JSON.stringify(KEY)}, JSON.stringify({ mode: '${m}', tenants: '2' }))`); await t.reload(2500);
    await t.send('Emulation.setEmulatedMedia', { media: 'print' }); await t.wait(200);
    const st = await t.eval(STATE);
    s.check(`print, "${m}" + a stored "2 tenants": capped to 1 tenant line, fits`, st.tenants.length === 1 && st.spare >= 0 && (m !== 'gallery' || st.img), JSON.stringify(st));
    await t.send('Emulation.setEmulatedMedia', { media: '' });
  }
  await t.eval(`localStorage.removeItem('lpr_signature')`);
  await t.eval(`localStorage.removeItem(${JSON.stringify(KEY)})`); await t.reload(2500);
  s.check('Setup → Sender offers None / 1 tenant only (no 2-tenant option that would not fit)',
    await openSetupTab(t, 'Sender') && (await t.eval(`[...document.querySelectorAll('[data-sigopt="tenants"] option')].map(o => o.value).join(',')`)) === '0,1');

  // Blank print: the header rows draw their own write-in lines — no doubled lines.
  await t.eval(`document.querySelectorAll('[data-contact-field],[data-owner-field]').forEach(e => e.textContent = '')`);
  await t.send('Emulation.setEmulatedMedia', { media: 'print' }); await t.wait(200);
  const dbl = await t.eval(`[...document.querySelectorAll('.ua-fields [data-contact-field]')].filter(e => getComputedStyle(e, '::after').borderBottomStyle === 'solid' && getComputedStyle(e, '::after').content !== 'none').length`);
  s.check('blank print: Resident Name / Address rows keep their single line (no doubled lines)', dbl === 0, 'field lines=' + dbl);
  const txt = await t.eval(`({ addr: document.querySelector('.ua-addr').innerText.trim(), role: document.querySelector('.signoff .signed-role').innerText.trim(),
    name: getComputedStyle(document.querySelector('.signoff .signed-name')).display })`);
  s.check('blank print: no stray ", ," in Address; no dangling "·" after the title; signer\'s printed name shows (full-size rows)',
    !/,/.test(txt.addr) && !/·\s*$/.test(txt.role) && txt.name !== 'none', JSON.stringify(txt));
  await t.send('Emulation.setEmulatedMedia', { media: '' });
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }
s.done();
