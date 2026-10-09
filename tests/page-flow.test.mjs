// Automatic multi-page flow (page-flow.js) on Letterhead.
import { open } from './lib/cdp.mjs';
import { url, suite, ARTIFACTS } from './lib/site.mjs';
import { join } from 'node:path';

const s = suite('Page flow — Letterhead');
const STATE = `(() => [...document.querySelectorAll('.stage > .sheet')].filter(x => x.offsetHeight > 0).map((x, i) => {
  const b = x.querySelector(':scope > .lh-body'); const kids = [...b.children].filter(k => k.offsetParent);
  return { i, h: x.offsetHeight, over: Math.max(0, ...kids.map(k => k.offsetTop + k.offsetHeight)) - b.clientHeight,
    num: (x.querySelector(':scope > .flow-pageno') || {}).textContent || '', meta: (x.querySelector('.flow-head-meta') || {}).textContent || '',
    wm: x.querySelectorAll(':scope > .watermark:not(.mode-hidden)').length, first: (kids[0] && kids[0].textContent.slice(0, 40)) || '' };
}))()`;
const TEXT = `[...document.querySelectorAll('.stage > .sheet .lh-body')].map(b => b.textContent).join('').replace(/\\s+/g, ' ').trim()`;
const PARA = (n, words) => Array.from({ length: n }, (_, k) => '<p>Paragraph ' + (k + 1) + '. ' +
  Array.from({ length: words }, (_, w) => ['the', 'payment', 'plan', 'balance', '<b>monthly</b>', 'tenant', 'agreement', 'schedule'][w % 8]).join(' ') + '.</p>').join('');
const SET_BODY = html => `(() => { const s = document.querySelector('.sheet[data-flow]'); LPR_FLOW.unpaginate(); const b = s.querySelector('.lh-body');
  b.querySelectorAll(':scope > p, :scope > .flow-break').forEach(p => p.remove());
  b.querySelector('.signoff').insertAdjacentHTML('beforebegin', ${JSON.stringify(html)});
  document.querySelector('.recipient [data-contact-field="name"]').textContent = 'Jane Doe';
  document.querySelector('.date [data-fill-field]').textContent = 'October 8, 2026';
  LPR_FLOW.paginate(); return true; })()`;
const ROUNDTRIP = `(() => { LPR_FLOW.unpaginate(); const h = document.querySelector('.sheet[data-flow] .lh-body').innerHTML; LPR_FLOW.paginate(); return h; })()`;

const t = await open(url('Letterhead.html'));
try {
  let st = await t.eval(STATE);
  s.check('default letter is 1 page with no page number', st.length === 1 && !st[0].num, JSON.stringify(st));
  s.check('page-flow loaded', await t.eval('!!window.LPR_FLOW'));

  await t.eval(SET_BODY(PARA(14, 70))); await t.wait(300);
  st = await t.eval(STATE);
  s.check('long letter paginates to 3+ pages', st.length >= 3, 'pages=' + st.length);
  s.check('no page overflows its body', st.every(p => p.over <= 1), st.map(p => p.over).join(','));
  s.check('every sheet is exactly 11in', st.every(p => p.h === 1056), st.map(p => p.h).join(','));
  s.check('page numbers read "Page X of Y"', st.every((p, i) => p.num === `Page ${i + 1} of ${st.length}`), st.map(p => p.num).join(' | '));
  s.check('continuation heading = recipient · date', st.slice(1).every(p => p.meta === 'Jane Doe · October 8, 2026'), st[1] && st[1].meta);

  const a = await t.eval(ROUNDTRIP), b = await t.eval(ROUNDTRIP);
  s.check('unpaginate → paginate round trip is lossless and stable', a === b, a.length + ' vs ' + b.length);
  s.check('no split <b> fragments accumulate', !/<\/b><b>/.test(b));
  s.check('no flow attributes left after unpaginate', !/data-flow-(head|tail|i)/.test(a));

  const textPaged = await t.eval(TEXT);
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(500);
  const ed = await t.eval(`({ sheets: document.querySelectorAll('.stage > .sheet').length, guides: document.querySelectorAll('.flow-guide').length, h: document.querySelector('.sheet[data-flow]').offsetHeight, nums: document.querySelectorAll('.flow-pageno').length })`);
  s.check('edit mode = one continuous sheet', ed.sheets === 1 && ed.h > 1056 && ed.nums === 0, JSON.stringify(ed));
  s.check('edit-mode guides = page count − 1', ed.guides === st.length - 1, ed.guides + ' vs ' + (st.length - 1));
  await t.eval(`(() => { const p = document.querySelector('.sheet[data-flow] .lh-body p'); p.insertAdjacentText('beforeend', ' EXTRA EDITED SENTENCE.');
    const p5 = [...document.querySelectorAll('.sheet[data-flow] .lh-body > p')][4]; const r = document.createRange(); r.setStart(p5.firstChild, 3); r.collapse(true);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); LPR_FLOW.insertBreak(); })()`);
  await t.wait(400);
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(400);
  st = await t.eval(STATE);
  const textAfter = await t.eval(TEXT);
  s.check('Done re-paginates with no overflow', st.length >= 3 && st.every(p => p.over <= 1), 'pages=' + st.length);
  const firstDiff = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return JSON.stringify({ before: a.slice(Math.max(0, i - 40), i + 40), after: b.slice(Math.max(0, i - 40), i + 40) }); };
  const stripped = textAfter.replace(' EXTRA EDITED SENTENCE.', '');
  s.check('edit kept every word and added the new sentence', textAfter.includes('EXTRA EDITED SENTENCE.') && stripped === textPaged, firstDiff(textPaged, stripped));
  s.check('forced page break starts a page at paragraph 5', st.some(p => p.first.startsWith('Paragraph 5.')), st.map(p => p.first.slice(0, 14)).join(' | '));

  let worst = null, n = 0;
  for (let words = 40; words <= 120; words += 4) {
    await t.eval(SET_BODY(PARA(5, words)));
    const r = await t.eval(`(() => { const so = document.querySelector('.signoff'); const kids = [...so.parentElement.children].filter(k => k.offsetParent);
      const i = kids.indexOf(so), prev = kids[i - 1]; return { i, prevLines: prev && prev.tagName === 'P' ? Math.round(prev.offsetHeight / parseFloat(getComputedStyle(prev).lineHeight)) : 99 }; })()`);
    n++; if (r.i === 0 || r.prevLines < 2) worst = { words, ...r };
  }
  s.check(`sign-off always has ≥2 body lines above it (${n} layouts)`, !worst, JSON.stringify(worst));
  const wo = await t.eval(`[...document.querySelectorAll('[data-flow-head],[data-flow-tail]')].map(p => Math.round(p.offsetHeight / parseFloat(getComputedStyle(p).lineHeight))).filter(n => n < 2)`);
  s.check('no split paragraph piece shorter than 2 lines', wo.length === 0, JSON.stringify(wo));

  await t.eval(SET_BODY(PARA(10, 70)));
  await t.eval(`document.querySelector('.mode-btn[data-mode="on"]').click()`); await t.wait(300);
  st = await t.eval(STATE);
  s.check('watermark on every page when on', st.every(p => p.wm === 1), st.map(p => p.wm).join(','));
  await t.eval(`document.querySelector('.mode-btn[data-mode="off"]').click()`); await t.wait(300);
  st = await t.eval(STATE);
  s.check('no watermark on any page when off', st.every(p => p.wm === 0));
  const pdf = await t.printPdf(join(ARTIFACTS, 'page-flow-print.pdf'));
  s.check('browser print: PDF page count = sheet count', pdf === st.length, `pdf=${pdf} sheets=${st.length}`);

  await t.eval(`document.querySelector('.sheet[data-flow] .lh-body > p').insertAdjacentHTML('beforeend', ' ' + 'more words here '.repeat(150))`);
  await t.wait(500);
  const st2 = await t.eval(STATE);
  s.check('content change reflows automatically', st2.length > st.length && st2.every(p => p.over <= 1), st.length + ' → ' + st2.length);
  await t.viewport(400, 900); await t.wait(300); await t.eval('LPR_FLOW.paginate()');
  const st3 = await t.eval(STATE);
  s.check('phone width: same pagination', st3.length === st2.length && st3.every(p => p.over <= 1), st3.length + ' vs ' + st2.length);
  await t.viewport(1100, 1400); await t.eval('LPR_FLOW.paginate()');
  await t.eval(SET_BODY('<p>Short letter.</p>'));
  st = await t.eval(STATE);
  s.check('short again → 1 page, no number', st.length === 1 && !st[0].num);
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); s.done(); }
