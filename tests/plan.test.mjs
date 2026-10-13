// Regression from a real AI-drafted payment-plan addendum pasted into
// Letterhead (2026-10-13): header markers, "---" dividers, blank-print "$",
// full-address line, signer line with no title. Keys only — no real data.
import { open } from './lib/cdp.mjs';
import { url, suite } from './lib/site.mjs';

const s = suite('AI-drafted payment plan on Letterhead');
const DRAFT = `^^Lease Addendum^^
==Past-Due Rent | Payment Plan Addendum==

This Past-Due Rent Payment Plan Addendum ("Addendum") is entered into on this {{date: Agreement Date}}, by and between:

**Landlord:** **{{landlord}}**
**Tenant(s):** **{{first name}} {{last name}}**
**Premises Address:** {{tenant full address}}

---

#### 1. Acknowledgment of Total Delinquent Rent
Tenant explicitly acknowledges owing a total outstanding balance of **{{amount: Total Delinquent Rent}}** in unpaid tenant rent.

* * *

#### 2. Condition Precedent & Effective Date
1. The full tenant rent portion due on **{{date: First Payment Due Date}}**; **AND**
2. The fixed back-rent installment of **{{amount: Monthly Repayment Amount}}** due on **{{date: First Repayment Due Date}}**.`;
const PASTE = (html, text) => `(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); b.querySelectorAll(':scope > p').forEach(p => p.remove());
  const p = document.createElement('p'); p.innerHTML = '<br>'; b.querySelector('.signoff').before(p); document.querySelector('.sheet').focus();
  const r = document.createRange(); r.setStart(p, 0); r.collapse(true); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  const dt = new DataTransfer(); if (${JSON.stringify(html)}) dt.setData('text/html', ${JSON.stringify(html)}); dt.setData('text/plain', ${JSON.stringify(text)});
  p.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); })()`;

const t = await open(url('Letterhead.html'));
try {
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(400);
  await t.eval(PASTE('', DRAFT)); await t.wait(300);
  const st = await t.eval(`(() => { const b = document.querySelector('.sheet[data-flow] .lh-body');
    return { dividers: /(^|\\n)\\s*(-{3,}|\\*\\s*\\*\\s*\\*)\\s*($|\\n)/.test(b.innerText) || !!b.querySelector('hr'), badge: (b.querySelector('.doc-badge') || {}).textContent,
      heads: b.querySelectorAll('h4, h3, .subject').length, amounts: b.querySelectorAll('[data-fill-field="amount"]').length }; })()`);
  s.check('"---" and "* * *" dividers are dropped; header + headings + fields come through', !st.dividers && st.badge === 'Lease Addendum' && st.heads >= 2 && st.amounts === 2, JSON.stringify(st));
  // Rich-text paste with an <hr> divider: dropped too.
  await t.eval(PASTE('<p>Before the line</p><hr><p>After the line</p>', 'Before the line\n---\nAfter the line')); await t.wait(200);
  s.check('rich-text <hr> divider is dropped', !(await t.eval(`!!document.querySelector('.sheet[data-flow] .lh-body hr')`)));
  await t.eval(PASTE('', DRAFT)); await t.wait(300);
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(700);
  await t.eval(`(() => { const k = document.querySelector('.tt-backdrop [data-act="keep"]'); if (k) k.click(); })()`); await t.wait(300);

  // Blank print.
  await t.eval(`document.querySelectorAll('[data-fill-field],[data-contact-field],[data-tenant-field]').forEach(e => e.textContent = '')`);
  await t.eval(`document.querySelectorAll('.signed-role [data-employee-field="title"]').forEach(e => e.textContent = '')`);   // a signer with no title
  await t.send('Emulation.setEmulatedMedia', { media: 'print' }); await t.wait(300);
  const bl = await t.eval(`(() => { const a = document.querySelector('.stage > .sheet [data-fill-label="Total Delinquent Rent"]'); const be = getComputedStyle(a, '::before'), af = getComputedStyle(a, '::after');
    const fa = document.querySelector('.stage > .sheet .lpr-full-addr'); const lh = parseFloat(getComputedStyle(fa.closest('p')).lineHeight);
    const role = document.querySelector('.stage > .sheet[data-flow] .signoff .signed-role, .stage > .sheet .signoff .signed-role');
    return { dollar: be.content, lineOnField: getComputedStyle(a).borderBottomStyle, line: af.borderBottomStyle,
      addrLines: Math.round(fa.getBoundingClientRect().height / lh), role: role ? role.innerText.trim() : '' }; })()`);
  s.check('blank print: "$" comes BEFORE the write-in line, not on it', bl.dollar === '"$"' && bl.line === 'solid' && bl.lineOnField !== 'solid', JSON.stringify(bl));
  s.check('blank print: the full address\'s write-in lines fit on one line', bl.addrLines === 1, JSON.stringify(bl));
  s.check('signer with no title: no leading "·" before the company', !/^·/.test(bl.role), JSON.stringify(bl.role));
  await t.send('Emulation.setEmulatedMedia', { media: '' });
  s.check('no console errors', t.logs.filter(x => !/^dialog beforeunload/.test(x)).length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }
s.done();
