// Edit mode + Print Blank behaviour that depends on the shared field-token lists.
import { open } from './lib/cdp.mjs';
import { url, suite } from './lib/site.mjs';

const s = suite('Editing + Print Blank');
const t = await open(url('Rent Increase Notice.html'));
try {
  // ---- Print Blank: clears fill-ins + recipient, keeps employee/owner ----
  await t.eval(`(() => { document.querySelectorAll('[data-contact-field="name"]').forEach(e => e.textContent = 'Jane Doe');
    document.querySelectorAll('[data-fill-field]').forEach(e => e.textContent = 'FILLED'); })()`);
  const pb = await t.eval(`(() => { let seen = null;
    window.print = () => { seen = {
      fill: [...document.querySelectorAll('[data-fill-field]')].every(e => e.textContent === ''),
      contact: [...document.querySelectorAll('[data-contact-field]')].every(e => e.textContent === ''),
      owner: [...document.querySelectorAll('[data-owner-field]')].some(e => e.textContent.trim() !== ''),
      employeeKept: [...document.querySelectorAll('[data-employee-field]')].filter(e => !e.closest('.signoff')).some(e => e.textContent.trim() !== '')
    }; };
    document.getElementById('tt-export-btn').click();
    document.querySelector('.tt-menu-item[data-export="print-blank"]').click();
    return new Promise(r => setTimeout(() => { window.dispatchEvent(new Event('afterprint')); r(seen); }, 300)); })()`);
  s.check('Print Blank clears every fill-in and recipient field', pb && pb.fill && pb.contact, JSON.stringify(pb));
  s.check('Print Blank keeps the company (owner) and header employee contact', pb && pb.owner && pb.employeeKept, JSON.stringify(pb));
  const restored = await t.eval(`({ fill: [...document.querySelectorAll('[data-fill-field]')].every(e => e.textContent === 'FILLED'), name: document.querySelector('[data-contact-field="name"]').textContent })`);
  s.check('after printing, every value comes back', restored.fill && restored.name === 'Jane Doe', JSON.stringify(restored));

  // ---- Edit mode: field tokens are atomic chips ----
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(250);
  const chips = await t.eval(`(() => { const toks = [...document.querySelectorAll('.sheet ' + LPR_UTIL.TOKEN_SEL.split(',').join(', .sheet '))];
    return { n: toks.length, allLocked: toks.every(x => x.getAttribute('contenteditable') === 'false'), sheetEditable: document.querySelector('.sheet').getAttribute('contenteditable') }; })()`);
  s.check('edit mode: every field token (all six types) is a locked chip', chips.n > 5 && chips.allLocked && chips.sheetEditable === 'true', JSON.stringify(chips));
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(250);
  const unlocked = await t.eval(`[...document.querySelectorAll(LPR_UTIL.TOKEN_SEL)].every(x => !x.hasAttribute('contenteditable'))`);
  s.check('Done: chips unlocked again', unlocked);
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }

// ---- "Fields were removed" warning: quiet for deliberate deletions ----------
// Real key presses over CDP (execCommand doesn't fire beforeinput, which is
// how template-tools spots a deliberate deletion). Target: the last-name chip
// in "Dear {first} {last},". Each case: Edit → remove it → Done → was the
// warning shown? A field removed by script must still warn.
const KEY = { Backspace: 8, Delete: 46 };
const press = async (t, key) => { for (const type of ['keyDown', 'keyUp']) await t.send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: KEY[key] }); };
const CHIP = `document.querySelector('.sheet .lh-body p [data-contact-field="last_name"]')`;
const SELECT = rangeJs => `(() => { const c = ${CHIP}; const p = c.parentElement; document.querySelector('.sheet').focus();
  const r = document.createRange(); ${rangeJs}; const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); return true; })()`;
const AROUND = `r.setStart(c.previousSibling, 0); r.setEnd(c.nextSibling, 1)`;     // "Dear …[ Doe,]…"
const QUIET = [
  ['highlight + Backspace', AROUND, t => press(t, 'Backspace')],
  ['caret after chip + Backspace', `r.setStartAfter(c); r.collapse(true)`, t => press(t, 'Backspace')],
  ['caret before chip + Delete', `r.setStartBefore(c); r.collapse(true)`, t => press(t, 'Delete')],
  ['chip selected + Backspace', `r.selectNode(c)`, t => press(t, 'Backspace')],
  ['highlight + type', AROUND, t => t.send('Input.insertText', { text: 'X' })],
  ['highlight + paste', AROUND, t => t.eval(`(() => { const dt = new DataTransfer(); dt.setData('text/plain', 'Smith,');
    getSelection().anchorNode.parentElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); })()`)],
  ['removed by script', null, t => t.eval(`${CHIP}.remove()`)],
];
const w = await open(url('Rent Increase Notice.html'));
try {
  for (const [label, rangeJs, act] of QUIET) {
    await w.reload();
    await w.eval(`document.querySelectorAll('[data-contact-field="first_name"]').forEach(e => e.textContent = 'Jane'); document.querySelectorAll('[data-contact-field="last_name"]').forEach(e => e.textContent = 'Doe')`);
    await w.eval(`document.getElementById('tt-edit-btn').click()`); await w.wait(250);
    if (rangeJs) await w.eval(SELECT(rangeJs));
    await act(w); await w.wait(150);
    const gone = await w.eval(`!document.querySelector('.sheet .lh-body p [data-contact-field="last_name"]')`);
    await w.eval(`document.getElementById('tt-edit-btn').click()`); await w.wait(300);
    const warned = await w.eval(`(() => { const d = document.querySelector('.tt-backdrop .tt-dialog'); const txt = d ? d.textContent : ''; const k = document.querySelector('.tt-backdrop [data-act="keep"]'); if (k) k.click(); return txt; })()`);
    if (rangeJs) s.check(`quiet warning — ${label}: field removed, no warning`, gone && !warned, JSON.stringify({ gone, warned }));
    else s.check(`quiet warning — ${label}: still warns`, gone && /unlinked/i.test(warned), JSON.stringify({ gone, warned }));
  }
  const errs = w.logs.filter(l => !/^dialog beforeunload/.test(l)); // reloading after an edit = expected "unsaved changes" prompt
  s.check('quiet warning: no console errors', errs.length === 0, errs.join(' || '));
} catch (e) { s.crash(e); }
finally { await w.close(); }

// ---- Font size + colour from a mouse selection, on any sheet ----------------
// The selection is made programmatically (fires selectionchange, like a mouse
// drag) and the size/colour is applied WITHOUT a mousedown on the control, so
// this exercises the selection tracker — which used to watch only the first
// .sheet, so Security Deposit's 2nd/3rd variants silently ignored it.
const CASES = [['Letterhead.html', null], ['Security Deposit.html', 'partial'], ['Security Deposit.html', 'returned']];
for (const [page, mode] of CASES) {
  const label = page.replace('.html', '') + (mode ? ' (' + mode + ')' : '');
  const e = await open(url(page));
  try {
    if (mode) { await e.eval(`document.querySelector('.mode-btn[data-mode="${mode}"]').click()`); await e.wait(200); }
    await e.eval(`document.getElementById('tt-edit-btn').click()`); await e.wait(250);
    const SELECT = n => `(() => { const sh = [...document.querySelectorAll('.sheet')].find(x => x.offsetHeight > 0);
      const p = [...sh.querySelectorAll('.lh-body p')].filter(p => p.firstChild && p.firstChild.nodeType === 3 && p.firstChild.data.trim().length > 20)[${'${n}'}];
      const r = document.createRange(); r.setStart(p.firstChild, 2); r.setEnd(p.firstChild, 14);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); return p.firstChild.data.slice(2, 14); })()`;
    const picked = await e.eval(SELECT(0).replace('${n}', '0'));
    await e.wait(150);
    await e.eval(`(() => { const s = document.getElementById('tt-font-size'); s.value = '16'; s.dispatchEvent(new Event('change')); })()`);
    const size = await e.eval(`(() => { const sh = [...document.querySelectorAll('.sheet')].find(x => x.offsetHeight > 0); const sp = [...sh.querySelectorAll('span')].find(x => x.style.fontSize === '16pt'); return sp ? sp.textContent : null; })()`);
    s.check(`${label}: font size applies to the selected text`, size === picked, JSON.stringify({ picked, size }));
    // The sized paragraph now starts with a short text node, so index 0 is the next paragraph.
    const picked2 = await e.eval(SELECT(0).replace('${n}', '0'));
    await e.wait(150);
    await e.eval(`(() => { const c = document.querySelector('.tt-color-chip[data-color="#283891"]'); c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); })()`);
    const color = await e.eval(`(() => { const sh = [...document.querySelectorAll('.sheet')].find(x => x.offsetHeight > 0); const sp = [...sh.querySelectorAll('span')].find(x => x.style.color === 'rgb(40, 56, 145)'); return sp ? sp.textContent : null; })()`);
    s.check(`${label}: colour applies to the selected text`, color === picked2, JSON.stringify({ picked2, color }));
    // Typing + Undo still work afterwards.
    const undo = await e.eval(`(async () => { const sh = [...document.querySelectorAll('.sheet')].find(x => x.offsetHeight > 0); const p = sh.querySelector('.lh-body p:last-of-type') || sh.querySelector('.lh-body p');
      const r = document.createRange(); r.selectNodeContents(p); r.collapse(false); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      document.execCommand('insertText', false, ' ZQXJ'); const typed = sh.textContent.includes('ZQXJ');
      document.querySelector('[data-cmd="undo"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 100)); return { typed, gone: !sh.textContent.includes('ZQXJ') }; })()`);
    s.check(`${label}: typing and Undo still work afterwards`, undo.typed && undo.gone, JSON.stringify(undo));
    s.check(`${label}: no console errors`, e.logs.length === 0, e.logs.join(' || '));
  } catch (err) { s.crash(err); }
  finally { await e.close(); }
}
s.done();
