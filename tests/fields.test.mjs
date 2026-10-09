// Field chips: automatic spacing (LPR_UTIL.spaceToken via Insert Field, and on Done).
import { open } from './lib/cdp.mjs';
import { url, suite, exportAs, saveAs, savedHtml } from './lib/site.mjs';

const s = suite('Field chips — spacing + formatting');
// A test paragraph just above the sign-off; caret placed in it at `at` chars.
const LINE = (html, at) => `(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); let p = document.getElementById('zt'); if (p) p.remove();
  p = document.createElement('p'); p.id = 'zt'; p.innerHTML = ${JSON.stringify(html)}; b.querySelector('.signoff').before(p);
  const tn = [...p.childNodes].find(n => n.nodeType === 3) || p; const r = document.createRange();
  if (tn === p) r.setStart(p, p.childNodes.length); else r.setStart(tn, ${at} < 0 ? tn.data.length : ${at});
  r.collapse(true); document.querySelector('.sheet').focus(); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); return true; })()`;
// The paragraph as text, each field shown as [key].
const SER = `[...document.getElementById('zt').childNodes].map(n => n.nodeType === 3 ? n.data : n.matches(LPR_UTIL.TOKEN_SEL) ? '[' + (n.dataset.contactField || n.dataset.fillField) + ']' : n.textContent).join('').replace(/\\u00a0/g, ' ')`;   // Chrome may turn a space into a (look-alike) nbsp while typing
const INS = sel => `document.querySelector('#lpr-insert-panel ${sel}').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))`;
const FIRST = INS('.lpr-ins-btn[data-ns="contact"][data-field="first_name"]');
const LAST = INS('.lpr-ins-btn[data-ns="contact"][data-field="last_name"]');
const AMOUNT = INS('.lpr-ins-btn[data-ff-type="amount"]');
const BTN = cmd => `document.querySelector('[data-cmd="${cmd}"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))`;

const t = await open(url('Letterhead.html'));
try {
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(400);
  const cases = [
    ['after a word, before a comma', 'Dear Jane,', 9, LAST, 'Dear Jane [last_name],'],
    ['before a word', 'Dear Smith', 5, FIRST, 'Dear [first_name] Smith'],
    ["before an apostrophe", "Visit 's home", 6, FIRST, "Visit [first_name]'s home"],
    ['after $ (amount)', 'Rent $ due', 6, AMOUNT, 'Rent $[amount] due'],
  ];
  for (const [label, html, at, btn, want] of cases) {
    await t.eval(LINE(html, at)); await t.eval(btn); await t.wait(100);
    const got = await t.eval(SER);
    s.check(`Insert Field ${label}: "${want}"`, got === want, JSON.stringify(got));
  }
  // Two fields back to back → exactly one space; Undo removes the field AND its space; Redo restores both.
  await t.eval(LINE('Name: ', -1)); await t.eval(FIRST); await t.wait(80); await t.eval(LAST); await t.wait(80);
  s.check('two fields inserted back to back get one space', (await t.eval(SER)) === 'Name: [first_name] [last_name]', await t.eval(SER));
  await t.eval(BTN('undo')); await t.wait(100);
  s.check('Undo removes the field and the space it added', (await t.eval(SER)) === 'Name: [first_name]', await t.eval(SER));
  await t.eval(BTN('redo')); await t.wait(100);
  s.check('Redo puts both back', (await t.eval(SER)) === 'Name: [first_name] [last_name]', await t.eval(SER));
  // Typing continues after the inserted space, not before it.
  await t.eval(LINE('Dear Smith', 5)); await t.eval(FIRST); await t.wait(80);
  await t.send('Input.insertText', { text: 'X' });
  s.check('typing after an insert goes after the field + space', (await t.eval(SER)) === 'Dear [first_name] XSmith', await t.eval(SER));
  // Done fixes fields that were glued together any other way.
  await t.eval(LINE('To<span data-contact-field="first_name"></span><span data-contact-field="last_name"></span>Inc, and $<span data-fill-field="amount"></span>.', 0));
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(500);
  await t.eval(`(() => { const k = document.querySelector('.tt-backdrop [data-act="keep"]'); if (k) k.click(); })()`); await t.wait(300);
  s.check('Done spaces glued fields ("JaneDoe"), keeps "$" + "." tight', (await t.eval(SER)) === 'To [first_name] [last_name] Inc, and $[amount].', await t.eval(SER));
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }

// ---- B / I / U / Plain / Size / Color on field chips ------------------------
const f = await open(url('Letterhead.html'));
try {
  await f.eval(`(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); const p = document.createElement('p'); p.id = 'zf';
    p.innerHTML = 'Dear <span data-contact-field="first_name">Jane</span> Smith, thanks.'; b.querySelector('.signoff').before(p); })()`);
  await f.eval(`document.getElementById('tt-edit-btn').click()`); await f.wait(400);
  const CH = `document.querySelector('#zf [data-contact-field="first_name"]')`;
  const SEL_CHIP = `(() => { document.querySelector('.sheet').focus(); const r = document.createRange(); r.selectNode(${CH}); const s = getSelection(); s.removeAllRanges(); s.addRange(r); })()`;
  const SEL_MIXED = `(() => { document.querySelector('.sheet').focus(); const p = document.getElementById('zf'); const r = document.createRange();
    r.setStart(p.firstChild, 0); const last = [...p.childNodes].filter(n => n.nodeType === 3 && /Smith/.test(n.data))[0]; r.setEnd(last, last.data.indexOf('Smith') + 5);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r); })()`;
  const ST = `(() => { const cs = getComputedStyle(${CH}); const sm = [...document.querySelectorAll('#zf *, #zf')].map(e => [...e.childNodes]).flat().find(n => n.nodeType === 3 && /Smith/.test(n.data));
    return { bold: parseInt(cs.fontWeight) >= 600, italic: cs.fontStyle === 'italic', under: /underline/.test(cs.textDecorationLine), size: parseFloat(cs.fontSize), color: cs.color,
             smithBold: parseInt(getComputedStyle(sm.parentElement).fontWeight) >= 600 }; })()`;
  const st = () => f.eval(ST);
  const btn = async cmd => { await f.eval(BTN(cmd)); await f.wait(80); };

  await f.eval(SEL_CHIP); await btn('bold');
  s.check('B on a selected field makes it bold', (await st()).bold);
  await btn('undo');
  s.check('one Undo takes the bold off the field', !(await st()).bold);
  await btn('redo');
  s.check('Redo puts it back', (await st()).bold);
  await btn('undo');

  await f.eval(SEL_MIXED); await btn('bold');
  const mixed = await st();
  s.check('B on text that includes a field bolds both', mixed.bold && mixed.smithBold, JSON.stringify(mixed));
  await btn('undo');
  const unmixed = await st();
  s.check('one Undo un-bolds both', !unmixed.bold && !unmixed.smithBold, JSON.stringify(unmixed));

  await f.eval(SEL_CHIP); await btn('italic'); await btn('underline');
  const iu = await st();
  s.check('I and U apply to a selected field', iu.italic && iu.under, JSON.stringify(iu));
  await f.eval(SEL_CHIP); await btn('removeFormat');
  const plain = await st();
  s.check('Plain clears the field\'s formatting', !plain.italic && !plain.under && !plain.bold, JSON.stringify(plain));

  // Everything at once, then Done / fill / Save As / HTML export.
  await f.eval(SEL_CHIP); await btn('bold'); await btn('italic'); await btn('underline');
  await f.eval(SEL_CHIP); await f.wait(150);
  await f.eval(`(() => { const s = document.getElementById('tt-font-size'); s.value = '16'; s.dispatchEvent(new Event('change')); })()`);
  await f.eval(SEL_CHIP); await f.wait(150);
  await f.eval(`document.querySelector('.tt-color-chip[data-color="#283891"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))`);
  const all = await st();
  const ALL_OK = x => x.bold && x.italic && x.under && Math.abs(x.size - 21.33) < 0.1 && x.color === 'rgb(40, 56, 145)';
  s.check('Size and Color apply to a selected field', ALL_OK(all), JSON.stringify(all));
  await f.eval(`document.getElementById('tt-edit-btn').click()`); await f.wait(500);
  s.check('formatting stays after Done', ALL_OK(await st()), JSON.stringify(await st()));
  await f.eval(`${CH}.textContent = 'Janet'`);
  s.check('formatting stays when the field is filled', ALL_OK(await st()), JSON.stringify(await st()));
  const html = (await exportAs(f, 'html', 1500)).map(b => b.buf.toString('utf-8')).join('');
  const SPAN = /<span[^>]*data-contact-field="first_name"[^>]*style="[^"]*font-weight: 700[^"]*font-style: italic[^"]*text-decoration: underline[^"]*"[^>]*>Janet</;
  s.check('formatting is in the HTML export', SPAN.test(html) && /font-size: 16pt/.test(html));
  const id = await saveAs(f, 'Chip formatting test');
  const saved = id ? await savedHtml(f, id) : '';
  s.check('formatting is in the Save As copy', SPAN.test(saved), id);
  s.check('no console errors', f.logs.length === 0, f.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await f.close(); }
s.done();
