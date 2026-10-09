// Clean paste (paste-clean.js) + page flow on pasted letters (page-flow.js).
import { open } from './lib/cdp.mjs';
import { url, suite } from './lib/site.mjs';
import * as F from './fixtures/paste-fixtures.mjs';

const s = suite('Paste + page flow');
// Click Done; if the "fields were removed" dialog appears (the test deleted
// the letter's own lines), answer "Keep my edits" like a user would.
const DONE = async t => { await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(250);
  await t.eval(`(() => { const k = document.querySelector('.tt-backdrop [data-act="keep"]'); if (k) k.click(); })()`); await t.wait(400); };

const SOURCES = [
  ['Google Docs', { html: F.GDOCS, text: '' }, F.GDOCS_SENTINELS, { lists: true, heads: true }],
  ['Word', { html: F.WORD, text: '' }, F.WORD_SENTINELS, { lists: false, heads: true }],
  ['AI rich text', { html: F.AI_HTML, text: '' }, F.AI_SENTINELS, { lists: true, heads: true }],
  ['AI plain text (Markdown)', { html: '', text: F.MARKDOWN }, F.MARKDOWN_SENTINELS, { lists: true, heads: true }],
  ['plain text', { html: '', text: F.PLAIN }, F.PLAIN_SENTINELS, { lists: false, heads: false }],
];
// Where the caret is when Ctrl+V is pressed.
const WHERE = {
  'date line': `(() => { const d = document.querySelector('.sheet[data-flow] .date'); const r = document.createRange(); r.selectNodeContents(d); r.collapse(true); return r; })()`,
  'mid-paragraph': `(() => { const p = [...document.querySelectorAll('.sheet[data-flow] .lh-body > p')].find(p => p.textContent.length > 40); const r = document.createRange(); r.setStart(p.firstChild, 20); r.collapse(true); return r; })()`,
  'empty line': `(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); b.querySelectorAll(':scope > p').forEach(p => p.remove()); const p = document.createElement('p'); p.innerHTML = '<br>'; b.querySelector('.signoff').before(p); const r = document.createRange(); r.setStart(p, 0); r.collapse(true); return r; })()`,
  'sign-off': `(() => { const p = document.querySelector('.sheet[data-flow] .signoff p'); const r = document.createRange(); r.selectNodeContents(p); r.collapse(false); return r; })()`,
};

const PASTE = (data, whereJs) => `(() => { const r = ${whereJs}; const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  const dt = new DataTransfer(); if (${JSON.stringify(data.html)}) dt.setData('text/html', ${JSON.stringify(data.html)}); dt.setData('text/plain', ${JSON.stringify(data.text || 'x')});
  const target = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
  target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return true; })()`;

// Structure + style checks while still editing (one continuous sheet).
const EDIT_STATE = `(() => { const body = document.querySelector('.sheet[data-flow] .lh-body');
  const STRUCT = '.date, .recipient, .signoff, .sig-block';
  const inside = [...body.querySelectorAll(STRUCT)].map(b => [...b.querySelectorAll('p, ol, ul, h1, h2, h3, h4, h5, h6')].filter(e => !e.closest('.signoff') || e.closest('.signoff') !== b || e.parentElement !== b || !/^Sincerely|^Thank you/.test(e.textContent.trim())).length).reduce((a, n) => a + n, 0);
  const foreign = [...body.querySelectorAll('[style]')].filter(e => !e.closest('.signoff, .sig-block') && /color|font-family|font-size|line-height|margin/i.test(e.getAttribute('style'))).map(e => e.tagName + ':' + e.getAttribute('style').slice(0, 50));
  const numbers = []; body.querySelectorAll('ol').forEach(ol => { let n = parseInt(ol.getAttribute('start') || '1', 10); [...ol.children].filter(c => c.tagName === 'LI').forEach(li => { numbers.push([li.textContent.trim().slice(0, 30), n++]); }); });
  return { inside, foreign, text: body.textContent.replace(/\\s+/g, ' ').trim(), signoff: document.querySelector('.sheet[data-flow] .signoff').innerHTML,
           lists: body.querySelectorAll('ol li, ul li').length, heads: body.querySelectorAll('h1, h2, h3, h4, h5, h6, .subject').length + [...body.querySelectorAll(':scope > p')].filter(p => p.querySelector('b, strong') && p.textContent.trim() === (p.querySelector('b, strong') || {}).textContent?.trim()).length, numbers }; })()`;

// After Done: the paginated pages.
const PAGES = `(() => { const sheets = [...document.querySelectorAll('.stage > .sheet')].filter(x => x.offsetHeight);
  const numbers = []; document.querySelectorAll('.stage > .sheet ol').forEach(ol => { let n = parseInt(ol.getAttribute('start') || '1', 10);
    [...ol.children].filter(c => c.tagName === 'LI').forEach(li => { if (!li.classList.contains('flow-li-cont')) numbers.push([li.textContent.trim().slice(0, 30), n]); n++; }); });
  return { numbers, text: sheets.map(x => x.querySelector(':scope > .lh-body').textContent).join('').replace(/\\s+/g, ' ').trim(),
    pages: sheets.map((x, i) => { const b = x.querySelector(':scope > .lh-body'); const kids = [...b.children].filter(k => k.offsetParent);
      const bt = b.getBoundingClientRect().top; const sc = b.getBoundingClientRect().height / b.offsetHeight;
      const bottoms = kids.map(k => (k.getBoundingClientRect().bottom - bt) / sc);
      const last = kids[kids.length - 1];
      const bold = el => { const t = el.textContent.trim(); if (!t || t.length > 120) return false; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, ok = true; while ((n = w.nextNode())) if (n.data.trim() && parseInt(getComputedStyle(n.parentElement).fontWeight, 10) < 600) ok = false; return ok; };
      const headLast = !!last && (/^H[1-6]$/.test(last.tagName) || last.classList.contains('subject') || (/^(P|DIV)$/.test(last.tagName) && !last.querySelector('p,ol,ul') && bold(last)));
      return { over: Math.max(0, ...bottoms) - b.clientHeight, slack: b.clientHeight - Math.max(0, ...bottoms), headLast, first: kids[0] ? kids[0].tagName + '.' + kids[0].className : '',
               meta: ((x.querySelector('.flow-head-meta') || {}).textContent || '') }; }) }; })()`;

for (const [srcName, data, sentinels, expect] of SOURCES) {
  for (const [whereName, whereJs] of Object.entries(WHERE)) {
    const label = `${srcName} → ${whereName}`;
    const t = await open(url('Letterhead.html'));
    try {
      await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(300);
      await t.eval(`(() => { let n = 0; while (!window.LPR_PASTE && n++ < 50) {} return !!window.LPR_PASTE; })()`);
      const before = await t.eval(EDIT_STATE);
      await t.eval(PASTE(data, whereJs)); await t.wait(250);
      const st = await t.eval(EDIT_STATE);
      const missing = sentinels.filter(x => !st.text.includes(x));
      const ok1 = st.inside === 0 && missing.length === 0 && st.foreign.length === 0 && st.signoff === before.signoff &&
        (!expect.lists || st.lists >= 3) && (!expect.heads || st.heads >= 2);
      s.check(`${label}: lands in the body, clean styles, nothing missing, sign-off untouched`, ok1,
        JSON.stringify({ inside: st.inside, missing, foreign: st.foreign.slice(0, 3), signoffSame: st.signoff === before.signoff, lists: st.lists, heads: st.heads }));
      await DONE(t);
      const pg = await t.eval(PAGES);
      const over = pg.pages.filter(p => p.over > 1);
      const headLast = pg.pages.slice(0, -1).filter(p => p.headLast);
      const numBad = st.numbers.filter(([txt, n]) => { const f = pg.numbers.find(([t2]) => t2 === txt); return f && f[1] !== n; });
      s.check(`${label}: ${pg.pages.length} page(s), no text cut off, every word kept`, over.length === 0 && pg.text === st.text,
        JSON.stringify({ over: over.map(p => p.over), sameText: pg.text === st.text }));
      s.check(`${label}: list numbering continues across pages; no heading stranded at a page bottom`, numBad.length === 0 && headLast.length === 0,
        JSON.stringify({ numBad: numBad.slice(0, 3), headLast: headLast.length }));
      if (pg.pages.length > 1) s.check(`${label}: continuation heading is short (name · date or the title)`, pg.pages.slice(1).every(p => p.meta.length <= 90), pg.pages.map(p => p.meta).join(' | '));
      if (whereName === 'empty line' && srcName === 'AI rich text') {
        // Ctrl+Z after a paste removes it (native undo stack).
        await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(300);
        const r = await t.eval(`(() => { const p = document.createElement('p'); p.innerHTML = '<br>'; document.querySelector('.sheet[data-flow] .signoff').before(p); const rg = document.createRange(); rg.setStart(p, 0); rg.collapse(true); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg);
          const dt = new DataTransfer(); dt.setData('text/html', '<p>UNDO SENTINEL one.</p><p>UNDO SENTINEL two.</p>'); p.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
          const pasted = document.body.textContent.includes('UNDO SENTINEL two.'); document.execCommand('undo'); return { pasted, gone: !document.querySelector('.sheet[data-flow]').textContent.includes('UNDO SENTINEL two.') }; })()`);
        s.check(`${label}: Ctrl+Z undoes a paste`, r.pasted && r.gone, JSON.stringify(r));
        await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(300);
      }
      s.check(`${label}: no console errors`, t.logs.length === 0, t.logs.join(' || '));
    } catch (e) { s.crash(e); }
    finally { await t.close(); }
  }
}

// ---- Pasting over a highlight replaces it — fields included ----
// (Joshua 2026-10-09: highlighted fields used to stay behind.) The letterhead,
// sign-off and tenant signature lines are never replaced, even after Ctrl+A.
const HIGHLIGHTS = {
  'date line → into the body': `(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); const r = document.createRange(); r.setStart(b.querySelector('.date'), 0); r.setEnd([...b.querySelectorAll(':scope > p')][1].firstChild, 12); return r; })()`,
  'the whole recipient block': `(() => { const rc = document.querySelector('.sheet[data-flow] .recipient'); const r = document.createRange(); r.selectNodeContents(rc); return r; })()`,
  'a line holding only a field + the next paragraph': `(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); const p = document.createElement('p'); const f = document.querySelector('.recipient [data-contact-field="name"]').cloneNode(true); p.appendChild(f); const after = [...b.querySelectorAll(':scope > p')][1]; after.before(p); const r = document.createRange(); r.setStart(p, 0); r.setEnd(after.firstChild, 8); return r; })()`,
  'text [field] text inside a paragraph': `(() => { const dear = [...document.querySelectorAll('.sheet[data-flow] .lh-body > p')].find(p => p.querySelector('[data-contact-field]')); dear.insertAdjacentText('beforeend', ' trailing words'); const r = document.createRange(); r.setStart(dear.firstChild, 2); r.setEnd(dear.lastChild, 5); return r; })()`,
  'Ctrl+A (whole sheet)': `(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('.sheet[data-flow]')); return r; })()`,
};
const HL_STATE = `(() => { const sh = document.querySelector('.sheet[data-flow]'), b = sh.querySelector('.lh-body');
  return { header: sh.querySelector('.lh-header').innerHTML, signoff: sh.querySelector('.signoff').innerHTML,
    fields: b.querySelectorAll(LPR_UTIL.TOKEN_SEL).length, date: !!b.querySelector(':scope > .date'), text: b.textContent.replace(/\s+/g, ' ') }; })()`;
for (const [name, rangeJs] of Object.entries(HIGHLIGHTS)) for (const kind of ['paragraphs', 'one line']) {
  const label = `highlight ${name} → paste ${kind}`;
  const t = await open(url('Letterhead.html'));
  try {
    await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(400);
    await t.eval(`(() => { document.querySelectorAll('.sheet[data-flow] [data-contact-field]').forEach(e => e.textContent = 'FILLED'); })()`);
    const res = await t.eval(`(() => { const r = ${rangeJs}; const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      const body = document.querySelector('.sheet[data-flow] .lh-body'), prot = body.querySelector('.signoff');
      const hit = [...body.querySelectorAll(LPR_UTIL.TOKEN_SEL)].filter(x => r.intersectsNode(x) && !prot.contains(x));
      const before = ${HL_STATE};
      const dt = new DataTransfer(); dt.setData('text/plain', ${JSON.stringify('REPLACED one.')} + (${JSON.stringify(kind)} === 'paragraphs' ? String.fromCharCode(10) + 'REPLACED two.' : ''));
      (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      const after = ${HL_STATE};
      const stillThere = hit.filter(x => x.isConnected).length;
      const fieldlessStyled = [...body.querySelectorAll(':scope > .date, :scope > .recipient')].filter(b => !b.querySelector(LPR_UTIL.TOKEN_SEL) && b.textContent.trim()).length;
      document.execCommand('undo');
      const undone = ${HL_STATE};
      return { hit: hit.length, stillThere, pasted: after.text.includes('REPLACED one.'), header: after.header === before.header, signoff: after.signoff === before.signoff,
               fieldlessStyled, undoFields: undone.fields === before.fields, undoDate: undone.date === before.date, undoText: !undone.text.includes('REPLACED one.') }; })()`);
    s.check(`${label}: the highlighted fields are replaced (${res.hit} field(s))`, res.hit > 0 && res.stillThere === 0 && res.pasted, JSON.stringify(res));
    s.check(`${label}: letterhead + sign-off untouched; no field-less block keeps date/address styling`, res.header && res.signoff && res.fieldlessStyled === 0, JSON.stringify(res));
    s.check(`${label}: Ctrl+Z brings the fields (and date line) back`, res.undoFields && res.undoDate && res.undoText, JSON.stringify(res));
    await DONE(t);
    const pg = await t.eval(PAGES);
    s.check(`${label}: after Done, no text cut off`, pg.pages.every(p => p.over <= 1), JSON.stringify(pg.pages.map(p => p.over)));
    s.check(`${label}: no console errors`, t.logs.length === 0, t.logs.join(' || '));
  } catch (e) { s.crash(e); }
  finally { await t.close(); }
}

// ---- A single line pastes inline, at the caret ----
{
  const t = await open(url('Letterhead.html'));
  try {
    await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(400);
    const r = await t.eval(`(() => { const p = [...document.querySelectorAll('.sheet[data-flow] .lh-body > p')].find(p => p.textContent.length > 40); const before = p.textContent;
      const rg = document.createRange(); rg.setStart(p.firstChild, 5); rg.collapse(true); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg);
      const dt = new DataTransfer(); dt.setData('text/html', '<span style="color:red;font-family:Comic Sans MS">INLINE <b>bit</b></span>'); p.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      return { same: p.isConnected, text: p.textContent.slice(0, 40), red: !!p.querySelector('[style*="color"]'), bold: !!p.querySelector('b') }; })()`);
    s.check('one line pastes inline into the same paragraph, colours dropped, bold kept', r.same && r.text.includes('INLINE bit') && !r.red && r.bold, JSON.stringify(r));
    s.check('no console errors (inline paste)', t.logs.length === 0, t.logs.join(' || '));
  } catch (e) { s.crash(e); }
  finally { await t.close(); }
}

// ---- Repair: letters already broken by the old paste (content inside the date line / one wrapper) ----
for (const [name, whereSel] of [['inside the date line', '.date'], ['one wrapper in a paragraph', ':scope > p:nth-of-type(2)']]) {
  const t = await open(url('Letterhead.html'));
  try {
    await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(300);
    const raw = await t.eval(`(() => { const body = document.querySelector('.sheet[data-flow] .lh-body'); const target = body.querySelector(${JSON.stringify(whereSel)});
      const r = document.createRange(); r.selectNodeContents(target); r.collapse(${JSON.stringify(whereSel)} === '.date'); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      document.execCommand('insertHTML', false, ${JSON.stringify(F.GDOCS)});   // what the browser did before clean paste
      return body.textContent.replace(/\\s+/g, ' ').trim(); })()`);
    await DONE(t);
    const pg = await t.eval(PAGES);
    const st = await t.eval(`(() => ({ inDate: document.querySelectorAll('.stage .date p, .stage .date ol, .stage .date h3').length }))()`);
    s.check(`repair (${name}): no text cut off, every word kept`, pg.pages.every(p => p.over <= 1) && pg.text === raw, JSON.stringify({ over: pg.pages.map(p => p.over), same: pg.text === raw }));
    if (whereSel === '.date') s.check(`repair (${name}): paragraphs moved out of the date line; heading shows the title`, st.inDate === 0 && pg.pages.slice(1).every(p => p.meta === 'SAMPLE PAYMENT AGREEMENT'), JSON.stringify({ ...st, meta: pg.pages.map(p => p.meta) }));
    s.check(`repair (${name}): no console errors`, t.logs.length === 0, t.logs.join(' || '));
  } catch (e) { s.crash(e); }
  finally { await t.close(); }
}

// ---- A payment-plan-shaped agreement: pages are well filled ----
{
  const t = await open(url('Letterhead.html'));
  try {
    await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(300);
    await t.eval(`(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); b.querySelector('.date').remove(); b.querySelector('.recipient').remove(); b.querySelectorAll(':scope > p').forEach(p => p.remove());
      const p = document.createElement('p'); p.innerHTML = '<br>'; b.querySelector('.signoff').before(p); const r = document.createRange(); r.setStart(p, 0); r.collapse(true); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      const dt = new DataTransfer(); dt.setData('text/html', ${JSON.stringify(F.AI_HTML + F.AI_HTML.replace(/Sample Repayment Plan/, 'Second Copy'))}); p.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); })()`);
    await DONE(t);
    const pg = await t.eval(PAGES);
    const lh = 11 * 1.6 * 96 / 72;   // body line height in px
    const gaps = pg.pages.slice(0, -1).map((p, i) => ({ page: i + 1, slackLines: +(p.slack / lh).toFixed(1), nextFirst: pg.pages[i + 1].first }));
    const bad = gaps.filter(g => g.slackLines > 5 && !/signoff|sig-block/.test(g.nextFirst));
    s.check('agreement: no page ends with a big empty gap (>5 lines) unless the signatures had to move', bad.length === 0, JSON.stringify(gaps));
    s.check('agreement: page 2+ heading shows the document title', pg.pages.slice(1).every(p => p.meta === 'Sample Repayment Plan'), pg.pages.map(p => p.meta).join(' | '));
    s.check('agreement: no text cut off', pg.pages.every(p => p.over <= 1), JSON.stringify(pg.pages.map(p => p.over)));
  } catch (e) { s.crash(e); }
  finally { await t.close(); }
}
s.done();
