// Regression from a real Gemini draft (2026-10-14): the "Copy for AI" text +
// "draft a past-due rent payment plan agreement" → fixtures/gemini-payment-plan.md
// (keys only, no real data), pasted into Letterhead as plain text / Markdown.
import { open } from './lib/cdp.mjs';
import { url, suite } from './lib/site.mjs';
import { readFileSync } from 'fs';

const s = suite('Gemini-drafted payment plan on Letterhead');
const DRAFT = readFileSync(new URL('./fixtures/gemini-payment-plan.md', import.meta.url), 'utf8');
const paste = txt => {
  const sel = getSelection(); const r = sel.getRangeAt(0);
  const p = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
  const dt = new DataTransfer(); dt.setData('text/plain', txt);
  p.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
};
const probe = () => {
  const vis = sel => [...document.querySelectorAll(sel)].filter(c => c.offsetHeight > 0);
  const sheets = vis('.sheet'), all = sheets.map(x => x.innerText).join(String.fromCharCode(10));
  const pageOf = el => sheets.findIndex(x => x.contains(el));
  const lead = vis('.sheet .lh-body p').find(p => /strict timeline:$/.test(p.textContent.trim()));
  const head = vis('.sheet .lh-body h3').find(h => /Repayment Schedule/.test(h.textContent));
  const box = vis('.sheet .callout')[0];
  return {
    pages: sheets.length,
    unknown: [...document.querySelectorAll('.lpr-key-unknown')].map(m => m.textContent),
    leftover: all.match(/\{\{|\}\}|\^\^|==|\[!|^#+ |\*\*|^\* /gm) || [],
    callouts: vis('.sheet .callout').map(c => c.className),
    boxLines: box ? box.querySelectorAll('br').length + 1 : 0, boxBars: box ? /\|/.test(box.textContent) : null,
    badge: vis('.sheet .doc-badge').map(c => c.textContent.trim()), title: vis('.sheet .doc-title').map(c => c.innerText.trim()),
    h3: vis('.sheet .lh-body h3').length, bullets: vis('.sheet .lh-body ul > li').length, numbered: vis('.sheet .lh-body ol > li').length,
    formats: [...new Set([...document.querySelectorAll('.sheet [data-fill-format]')].map(e => e.getAttribute('data-fill-format')))].sort(),
    leadPage: lead ? pageOf(lead) : -1, listPage: lead ? pageOf(lead.nextElementSibling) : -2, headPage: head ? pageOf(head) : -3,
  };
};

const t = await open(url('Letterhead.html'));
try {
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(500);
  await t.eval(`LPR_PASTE.clear(true)`); await t.wait(200);
  await t.eval('(' + paste.toString() + ')(' + JSON.stringify(DRAFT) + ')'); await t.wait(600);
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(800);
  await t.eval(`(() => { const k = document.querySelector('.tt-backdrop [data-act="keep"]'); if (k) k.click(); })()`); await t.wait(800);
  const r = await t.eval('(' + probe.toString() + ')()');
  s.check('every key recognised, no markup left as text (#, **, *, {{ }}, ^^, ==, [!)', !r.unknown.length && !r.leftover.length, JSON.stringify({ unknown: r.unknown, leftover: r.leftover }));
  s.check('header: small label + two-line title', r.badge[0] === 'Residential Lease Addendum' && /Agreement\s*\n\s*State of Maryland$/.test(r.title[0] || ''), JSON.stringify(r));
  s.check('[!gold] summary → one gold callout; its " | " separators become 5 lines', r.callouts.length === 1 && /callout-gold/.test(r.callouts[0]) && r.boxLines === 5 && r.boxBars === false, JSON.stringify(r));
  s.check('4 section headings, 8 bullet items (an item may continue on the next page) + 4 numbered items', r.h3 === 4 && r.bullets >= 8 && r.numbered === 4, JSON.stringify(r));
  s.check('per-place date formats kept (legal, numeric, short, weekday)', ['legal', 'numeric', 'short', 'weekday'].every(f => r.formats.includes(f)), JSON.stringify(r.formats));
  s.check('lead-in "…strict timeline:" stays on the same page as its list (and its heading)', r.leadPage >= 0 && r.leadPage === r.listPage && r.headPage === r.leadPage, JSON.stringify(r));
  s.check('flows onto more pages without errors', r.pages >= 2 && t.logs.filter(l => !/^dialog beforeunload/.test(l)).length === 0, r.pages + ' ' + t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }
s.done();
