// Clear body / Clear all (format bar, Letterhead) — paste-clean.js clear().
import { open } from './lib/cdp.mjs';
import { url, suite } from './lib/site.mjs';

const s = suite('Clear body / Clear all');
const LONG = `(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); const so = b.querySelector('.signoff');
  for (let i = 0; i < 40; i++) { const p = document.createElement('p'); p.textContent = 'Paragraph ' + i + ' of a long test letter that runs onto a second page.'; so.before(p); }
  document.querySelectorAll('[data-contact-field="name"]').forEach(e => e.textContent = 'Jane Doe'); })()`;
// Everything Clear must never touch, plus what it should change.
const STATE = `(() => { const sh = document.querySelector('.sheet[data-flow]'); const b = sh.querySelector('.lh-body');
  const outside = sh.cloneNode(true); outside.querySelector('.lh-body').remove();
  const protectedHtml = [...b.querySelectorAll(':scope > .signoff, :scope > .sig-block')].map(e => e.outerHTML).join('');
  const lines = [...b.children].filter(c => !c.matches('.signoff, .sig-block'));
  const sel = getSelection(); const caretIn = sel.rangeCount ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement).closest('.lh-body > *') : null;
  return { outside: outside.innerHTML, protectedHtml, body: b.innerHTML,
    date: !!b.querySelector(':scope > .date'), recipient: !!b.querySelector(':scope > .recipient'), dear: /Dear/.test(b.textContent),
    lines: lines.map(c => c.tagName + '.' + c.className + ':' + c.textContent.trim().slice(0, 30)),
    caretLine: caretIn ? lines.indexOf(caretIn) : -2 }; })()`;
const CLICK = cmd => `document.querySelector('[data-cmd="${cmd}"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))`;

for (const [cmd, all] of [['clearbody', false], ['clearall', true]]) {
  const label = all ? 'Clear all' : 'Clear body';
  const t = await open(url('Letterhead.html'));
  try {
    await t.eval(LONG); await t.wait(400);
    await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(400);
    const before = await t.eval(STATE);
    await t.eval(CLICK(cmd)); await t.wait(200);
    const after = await t.eval(STATE);
    s.check(`${label}: letterhead header unchanged`, after.outside === before.outside);
    s.check(`${label}: sign-off + signature lines unchanged`, after.protectedHtml === before.protectedHtml && after.protectedHtml.length > 0);
    s.check(`${label}: date + recipient ${all ? 'removed' : 'kept'}`, all ? (!after.date && !after.recipient) : (after.date && after.recipient), JSON.stringify(after.lines));
    s.check(`${label}: "Dear …" line and body removed`, !after.dear && !after.lines.some(l => /Paragraph/.test(l)), JSON.stringify(after.lines));
    const EMPTY = /^(P|DIV)\.:$/;      // a plain (unstyled) empty line
    s.check(`${label}: exactly one empty plain line left, caret in it`, after.lines.filter(l => EMPTY.test(l)).length === 1 && after.lines.length === (all ? 1 : 3) && EMPTY.test(after.lines[after.caretLine]), JSON.stringify(after.lines) + ' caret ' + after.caretLine);
    // One Undo brings back the exact letter.
    await t.eval(CLICK('undo')); await t.wait(200);
    const undone = await t.eval(STATE);
    s.check(`${label}: one Undo restores the letter exactly`, undone.body === before.body, JSON.stringify({ before: before.lines.slice(0, 5), undone: undone.lines.slice(0, 5) }));
    // Redo, then paste straight in.
    await t.eval(CLICK('redo')); await t.wait(200);
    await t.eval(`(() => { const dt = new DataTransfer(); dt.setData('text/plain', 'Fresh pasted text.'); const n = getSelection().anchorNode;
      (n.nodeType === 1 ? n : n.parentElement).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); })()`);
    const pasted = await t.eval(STATE);
    s.check(`${label}: a paste right after lands in the body`, pasted.lines.some(l => /^(P|DIV)\.:Fresh pasted text\./.test(l)) && pasted.protectedHtml === before.protectedHtml, JSON.stringify(pasted.lines));
    // Done: no "fields removed" warning; one page.
    await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(500);
    const warned = await t.eval(`!!document.querySelector('.tt-backdrop .tt-dialog')`);
    s.check(`${label}: no "fields removed" warning on Done`, !warned);
    s.check(`${label}: letter is one page after Done`, (await t.eval(`document.querySelectorAll('.stage > .sheet').length`)) === 1);
    s.check(`${label}: no console errors`, t.logs.length === 0, t.logs.join(' || '));
  } catch (e) { s.crash(e); }
  finally { await t.close(); }
}
s.done();
