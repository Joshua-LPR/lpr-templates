// Every one-page letter/notice (and each mode) keeps its content inside the
// bottom margin — on screen and as a blank print (empty fields → write-in
// lines). Sheets are overflow:hidden, so anything past the margin is lost on
// paper without any error; a PDF page count would not show it.
import { open } from './lib/cdp.mjs';
import { url, suite } from './lib/site.mjs';

const s = suite('One-page templates fit inside the margins');
const PAGES = ['24-Hour Notice.html', 'Non-Renewal Notice.html', 'Notice Template.html', 'Occupant Update.html', 'Rent Increase Notice.html',
  'Security Deposit.html', 'TOPA Notice - DHCD.html', 'Tenancy Confirmation.html', 'Utilities Addendum.html'];
// Known, logged, waiting on Joshua — reported but not failed.
const KNOWN = { 'TOPA Notice - DHCD.html|letter letter-2': 'bead joshu_AKIVA-wvd' };
const OVER = `[...document.querySelectorAll('.sheet')].filter(s => s.offsetHeight > 0).map(sh => { const r = sh.getBoundingClientRect(); const lim = r.bottom - parseFloat(getComputedStyle(sh).paddingBottom);
  let max = -1e9; sh.querySelectorAll('*').forEach(e => { const cs = getComputedStyle(e); if (cs.position === 'absolute' || cs.position === 'fixed') return; const b = e.getBoundingClientRect(); if (b.height && b.bottom > max) max = b.bottom; });
  return { cls: sh.className.replace(/\\bsheet\\b|\\bmode-hidden\\b|\\btt-\\S+/g, '').trim().replace(/\\s+/g, ' '), over: Math.round(max - lim) }; })`;
for (const page of PAGES) {
  const t = await open(url(page));
  try {
    const modes = [null, ...new Set(await t.eval(`[...document.querySelectorAll('.mode-bar .mode-btn')].map(b => b.dataset.mode)`))];
    for (const mode of modes) {
      if (mode) { await t.eval(`document.querySelector('.mode-btn[data-mode="${mode}"]').click()`); await t.wait(150); }
      for (const state of ['screen', 'blank print']) {
        if (state === 'blank print') {
          await t.eval(`document.querySelectorAll('[data-fill-field],[data-contact-field],[data-tenant-field]').forEach(e => e.textContent = '')`);
          await t.send('Emulation.setEmulatedMedia', { media: 'print' }); await t.wait(150);
        }
        for (const sh of await t.eval(OVER)) {
          const label = `${page.replace('.html', '')}${mode ? ' (' + mode + ')' : ''} [${sh.cls}] ${state}`;
          const known = KNOWN[page + '|' + sh.cls];
          if (known && sh.over > 1) console.log(`KNOWN ${label}: ${sh.over}px past the margin — ${known}`);
          else s.check(`${label}: inside the margin`, sh.over <= 1, `${sh.over}px past the bottom margin`);
        }
        if (state === 'blank print') { await t.send('Emulation.setEmulatedMedia', { media: '' }); await t.reload(2200); if (mode) { await t.eval(`document.querySelector('.mode-btn[data-mode="${mode}"]').click()`); await t.wait(150); } }
      }
    }
  } catch (e) { s.crash(e); }
  finally { await t.close(); }
}
s.done();
