// Header markers ^^label^^ / ==Title | Line 2== (field-keys.js): fill a notice's
// header area, or become a label + title block in the text where there is none.
import { open } from './lib/cdp.mjs';
import { url, suite, openSetupTab } from './lib/site.mjs';

const s = suite('Header markers ^^label^^ / ==title==');
const PASTE = text => `(() => { const b = [...document.querySelectorAll('.sheet .lh-body')].find(x => x.offsetHeight > 0); const p = document.createElement('p'); p.innerHTML = '<br>';
  b.querySelector('.signoff').before(p); [...document.querySelectorAll('.sheet')].find(x => x.offsetHeight > 0).focus();
  const r = document.createRange(); r.setStart(p, 0); r.collapse(true); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  const dt = new DataTransfer(); dt.setData('text/plain', ${JSON.stringify(text)}); p.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); })()`;
const EDIT = t => t.eval(`document.getElementById('tt-edit-btn').click()`).then(() => t.wait(400));
const DONE = async t => { await EDIT(t); await t.eval(`(() => { const k = document.querySelector('.tt-backdrop [data-act="keep"]'); if (k) k.click(); })()`); await t.wait(300); };
const MARKS = '/\\^\\^|==/';

// Notice Template: header area holds fill fields → set through the Fields tab.
const n = await open(url('Notice Template.html'));
try {
  await n.eval(`localStorage.removeItem('lpr_fill_' + LPR_UTIL.pageKey())`); await n.reload(2500);
  await EDIT(n);
  const EMPTY = `[...[...document.querySelectorAll('.sheet')].find(x => x.offsetHeight > 0).querySelectorAll('.lh-body > p')].filter(p => !p.textContent.trim() && !p.querySelector('[data-fill-field],[data-contact-field]')).length`;
  const emptyBefore = await n.eval(EMPTY);
  await n.eval(PASTE('^^Action Required^^\n==Water Shutoff | Notice==\n\nDear {{first name}},\n\nWater will be off on {{weekday date: Shutoff Date}}.'));
  await n.wait(300);
  const st = await n.eval(`(() => { const sh = [...document.querySelectorAll('.sheet')].find(x => x.offsetHeight > 0); const t = sh.querySelector('.doc-title'); const b = sh.querySelector('.doc-badge');
    return { badge: b.textContent.trim(), title: t.textContent.trim(), titleLines: Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight)),
      left: ${MARKS}.test(sh.querySelector('.lh-body').textContent), inBody: !!sh.querySelector('.lh-body .doc-title, .lh-body .doc-badge'),
      emptyLines: ${EMPTY}, dear: /Dear/.test(sh.querySelector('.lh-body').textContent) }; })()`);
  s.check('Notice Template: ^^…^^ fills the small label', st.badge === 'Action Required', JSON.stringify(st));
  s.check('Notice Template: ==A | B== fills the large title on two lines', /^Water Shutoff\s+Notice$/.test(st.title) && st.titleLines === 2, JSON.stringify(st));
  s.check('markers not left in the text, no extra blocks or empty lines; the rest pastes normally', !st.left && !st.inBody && st.emptyLines <= emptyBefore + 1 && st.dear, JSON.stringify({ st, emptyBefore }));
  await DONE(n);
  await openSetupTab(n, 'Fields');
  const f = await n.eval(`({ cat: document.querySelector('[data-ff-key="document_category"]').value, title: document.querySelector('[data-ff-key="notice_title"]').value })`);
  s.check('Fields tab shows the label and the two-line title', f.cat === 'Action Required' && /Water Shutoff\nNotice/.test(f.title), JSON.stringify(f));
  await n.eval(`localStorage.removeItem('lpr_fill_' + LPR_UTIL.pageKey())`);
  s.check('no console errors', n.logs.filter(l => !/^dialog beforeunload/.test(l)).length === 0, n.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await n.close(); }

// Security Deposit: fixed header text; a TYPED marker converts on Done.
const d = await open(url('Security Deposit.html'));
try {
  await EDIT(d);
  await d.eval(`(() => { const b = [...document.querySelectorAll('.sheet .lh-body')].find(x => x.offsetHeight > 0); const p = document.createElement('p'); p.textContent = '==Deposit | Applied=='; b.querySelector('.signoff').before(p); })()`);
  await DONE(d);
  const h = await d.eval(`(() => { const sh = [...document.querySelectorAll('.sheet')].find(x => x.offsetHeight > 0); return { html: sh.querySelector('.doc-title').innerHTML.trim(), left: /==/.test(sh.textContent) }; })()`);
  s.check('Security Deposit: typed ==A | B== replaces the fixed title (two lines) on Done', /^Deposit<br>Applied$/.test(h.html) && !h.left, JSON.stringify(h));
} catch (e) { s.crash(e); }
finally { await d.close(); }

// Letterhead has no header area: the markers become a label + title in the text.
const l = await open(url('Letterhead.html'));
try {
  await EDIT(l);
  await l.eval(PASTE('^^Lease Addendum^^\n==Past-Due Rent | Payment Plan Addendum==\n\nThis Addendum is entered into on {{date: Agreement Date}}.'));
  await l.wait(300);
  const st = await l.eval(`(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); const badge = b.querySelector(':scope > .doc-badge'), title = b.querySelector(':scope > .doc-title');
    return { badge: badge && badge.textContent, title: title && title.innerHTML, next: title && title.nextElementSibling && title.nextElementSibling.textContent.slice(0, 20),
      keep: !!(badge && title && badge.hasAttribute('data-flow-keep-next') && title.hasAttribute('data-flow-keep-next')), left: ${MARKS}.test(b.textContent), unknown: !!document.querySelector('.lpr-key-unknown') }; })()`);
  s.check('Letterhead: the markers become a label + two-line title in the text, kept with what follows',
    st.badge === 'Lease Addendum' && /^Past-Due Rent<br>Payment Plan Addendum$/.test(st.title) && /^This Addendum/.test(st.next) && st.keep && !st.left && !st.unknown, JSON.stringify(st));
  await DONE(l);
  const big = await l.eval(`(() => { const t = document.querySelector('.stage > .sheet .lh-body .doc-title'); return t ? parseFloat(getComputedStyle(t).fontSize) : 0; })()`);
  s.check('after Done the title is the large header size', big > 30, 'px=' + big);
  s.check('no console errors', l.logs.filter(x => !/^dialog beforeunload/.test(x)).length === 0, l.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await l.close(); }
s.done();
