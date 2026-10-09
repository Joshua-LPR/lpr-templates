// {{field keys}} (field-keys.js): matching, paste, Done, formatting, full
// address, legend. `node tests/keys.test.mjs --write` regenerates FIELD-KEYS.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { open } from './lib/cdp.mjs';
import { url, suite, REPO, saveAs, savedHtml, exportAs } from './lib/site.mjs';

const LEGEND_FILE = join(REPO, 'FIELD-KEYS.md');
if (process.argv.includes('--write')) {
  const t = await open(url('index.html'));
  try { writeFileSync(LEGEND_FILE, await t.eval('LPR_KEYS.legendText()')); console.log('wrote FIELD-KEYS.md'); }
  finally { await t.close(); }
  process.exit(0);
}

const s = suite('Field keys {{…}}');
const BTN = cmd => `document.querySelector('[data-cmd="${cmd}"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))`;
const DONE = async t => { await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(400);
  await t.eval(`(() => { const k = document.querySelector('.tt-backdrop [data-act="keep"]'); if (k) k.click(); })()`); await t.wait(300); };
// A fresh empty paragraph above the sign-off with the caret in it.
const LINE = `(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); const p = document.createElement('p'); p.id = 'zk' + Date.now(); p.innerHTML = '<br>';
  b.querySelector('.signoff').before(p); document.querySelector('.sheet').focus(); const r = document.createRange(); r.setStart(p, 0); r.collapse(true);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); return p.id; })()`;
const PASTE = (html, text) => `(() => { const dt = new DataTransfer(); if (${JSON.stringify(html)}) dt.setData('text/html', ${JSON.stringify(html)}); dt.setData('text/plain', ${JSON.stringify(text || 'x')});
  const n = getSelection().anchorNode; (n.nodeType === 1 ? n : n.parentElement).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); })()`;
const TOK = (sel, extra = '') => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const cs = getComputedStyle(e);
  return { text: e.textContent, bold: parseInt(cs.fontWeight) >= 600, italic: cs.fontStyle === 'italic', under: /underline/.test(cs.textDecorationLine) || !!e.closest('u'),
           locked: e.getAttribute('contenteditable') === 'false', label: e.getAttribute('data-fill-label') ${extra} }; })()`;

// ---- 1. Matching: spellings, overlaps, fill types ------------------------
const t = await open(url('Letterhead.html'));
try {
  await t.wait(500);
  const CASES = {
    'first name': 'contact.first_name', 'First_Name': 'contact.first_name', 'firstname': 'contact.first_name', '  FIRST   NAME ': 'contact.first_name',
    'name': 'contact.name', 'recipient name': 'contact.name', 'street address': 'contact.address_line1', 'address line 2': 'contact.address_line2',
    'phone': 'contact.phone', 'email': 'contact.email', 'city': 'contact.city',
    // overlaps: prefix picks the person; vendor + signer never bare
    'tenant phone': 'tenant.phone', 'tenant first name': 'tenant.first_name', 'tenant city': 'tenant.city',
    'vendor phone': 'vendor.phone', 'vendor: phone': 'vendor.phone', 'vendor work phone': 'vendor.phone', 'vendor name': 'vendor.name',
    'vendor email': 'vendor.email1', 'vendor email alternate': 'vendor.email2', 'vendor mobile': 'vendor.mobile', 'mobile': null, 'work phone': null,
    'signer name': 'employee.name', 'signer title': 'employee.title', 'title': null,
    'landlord': 'owner.name', 'company': 'owner.name',
    // tenant-only, no prefix needed
    'lease start': 'tenant.lease_start', 'rent amount': 'tenant.rent_amount', 'phone 2': 'tenant.phone2', 'email 1': 'tenant.email1', 'date of birth': 'tenant.dob',
    // fill-ins
    'date': 'fill.date:Date', 'time': 'fill.time:Time', 'amount': 'fill.amount:Amount', 'text': 'fill.text:Text',
    'date: Payment Due Date': 'fill.date:Payment Due Date', 'Amount: Back Rent': 'fill.amount:Back Rent', 'time:Inspection Time': 'fill.time:Inspection Time', 'text: Unit #': 'fill.text:Unit #',
    'full address': 'contact.full_address', 'tenant full address': 'tenant.full_address',
    'bogus key': null,
  };
  const got = await t.eval(`(${JSON.stringify(CASES)} && Object.keys(${JSON.stringify(CASES)}).map(k => { const r = LPR_KEYS.resolve(k);
    return [k, r ? r.ns + '.' + (r.field || r.preset) + (r.ns === 'fill' ? ':' + r.fillLabel : '') : null]; }))`);
  const wrong = got.filter(([k, v]) => v !== CASES[k]).map(([k, v]) => `${k} → ${v} (want ${CASES[k]})`);
  s.check(`${got.length} key spellings resolve as intended (overlaps, fill types, prefixes)`, !wrong.length, wrong.join('; '));
  const legend = await t.eval(`(() => { const E = LPR_KEYS.entries(); const names = E.map(e => e.name);
    return { dupes: names.filter((n, i) => names.indexOf(n) !== i), roundTrip: E.filter(e => LPR_KEYS.resolve(e.name) !== e).map(e => e.name) }; })()`);
  s.check('every legend key is unique and resolves to itself', !legend.dupes.length && !legend.roundTrip.length, JSON.stringify(legend));

  // ---- 2. Paste: Markdown + rich text, formatting, twins, unknown ----------
  // A recipient already picked (Letterhead's own field is the full name), and a
  // saved Fields-tab value for "Due Date" — new fields must pick both up.
  await t.eval(`(() => { const r = document.querySelector('.recipient [data-contact-field="name"]'); const s = document.createElement('span');
    s.setAttribute('data-contact-field', 'first_name'); s.textContent = 'Jane'; r.after(' ', s); })()`);
  await t.eval(`localStorage.setItem('lpr_fill_' + LPR_UTIL.pageKey(), JSON.stringify({ due_date: '10/31/2026' }))`);
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(400);
  const id1 = await t.eval(LINE);
  await t.eval(PASTE('', 'Dear {{first name}},\n\nPay **{{amount: Back Rent}}** by *{{date: Due Date}}* to {{landlord}}. {{bogus key}} Owed: ***{{amount: Balance Due}}***'));
  await t.wait(200);
  const P = `.sheet[data-flow] .lh-body`;
  const fn = await t.eval(TOK(`${P} p:not(.signoff p) [data-contact-field="first_name"]:not(.recipient *)`));
  s.check('pasted {{first name}} → recipient field, copies "Jane" from the page, locked chip', fn && fn.text === 'Jane' && fn.locked, JSON.stringify(fn));
  const amt = await t.eval(TOK(`${P} [data-fill-field="amount"][data-fill-label="Back Rent"]`));
  s.check('**{{amount: Back Rent}}** → bold amount field with that label', amt && amt.bold && amt.label === 'Back Rent', JSON.stringify(amt));
  const due = await t.eval(TOK(`${P} p:last-of-type [data-fill-field="date"][data-fill-label="Due Date"], ${P} i [data-fill-field="date"][data-fill-label="Due Date"]`));
  s.check('*{{date: Due Date}}* → italic date field, filled from the saved "Due Date" value', due && due.italic && /2026/.test(due.text), JSON.stringify(due));
  const bi = await t.eval(TOK(`${P} [data-fill-field="amount"][data-fill-label="Balance Due"]`));
  s.check('***{{amount: Balance Due}}*** → bold + italic field (the legend\'s example)', bi && bi.bold && bi.italic, JSON.stringify(bi));
  s.check('{{landlord}} → owner field', await t.eval(`!!document.querySelector('${P} p [data-owner-field="name"]')`));
  const unk = await t.eval(`(() => { const m = document.querySelector('.lpr-key-unknown'); return { mark: m && m.textContent, note: (document.getElementById('lpr-keys-note') || {}).textContent || '' }; })()`);
  s.check('unknown {{bogus key}} kept as highlighted text + listed in a notice', unk.mark === '{{bogus key}}' && /bogus key/.test(unk.note), JSON.stringify(unk));
  s.check('no leftover {{…}} for known keys after paste', await t.eval(`!/\\{\\{(first name|amount|date|landlord)/.test(document.querySelector('${P}').textContent)`));

  await t.eval(LINE);
  await t.eval(PASTE('<p>Mail to <u>{{full address}}</u>, attn <b>{{tenant first name}}</b>, re {{vendor phone}} at {{time: Inspection Time}}.</p>', ''));
  await t.wait(200);
  const fa = await t.eval(`(() => { const w = document.querySelector('${P} u .lpr-full-addr'); return w ? { n: w.querySelectorAll('[data-contact-field]').length, under: !!w.closest('u') } : null; })()`);
  s.check('rich-text underlined {{full address}} → underlined 5-field address', fa && fa.n === 5 && fa.under, JSON.stringify(fa));
  s.check('rich-text bold {{tenant first name}} → bold TENANT field (not recipient)', (await t.eval(TOK(`${P} b [data-tenant-field="first_name"]`)))?.bold);
  s.check('{{vendor phone}} → vendor field; {{time: …}} → time fill field', await t.eval(`!!document.querySelector('${P} [data-vendor-field="phone"]') && !!document.querySelector('${P} [data-fill-field="time"][data-fill-label="Inspection Time"]')`));

  // ---- 3. Typed keys convert on Done ---------------------------------------
  await t.eval(LINE);
  await t.send('Input.insertText', { text: 'Typed {{last name}} and {{text: Unit}} and {{date}}' });
  await DONE(t);
  const typed = await t.eval(`(() => { const b = document.querySelector('${P}'); return { last: !!b.querySelector('p [data-contact-field="last_name"]'), unit: !!b.querySelector('[data-fill-field="text"][data-fill-label="Unit"]'),
    date: !!b.querySelector('p [data-fill-field="date"][data-fill-label="Date"]'), left: /\\{\\{(last name|text|date)\\}?/.test(b.textContent), unlocked: ![...b.querySelectorAll(LPR_UTIL.TOKEN_SEL)].some(e => e.hasAttribute('contenteditable')) }; })()`);
  s.check('typed keys become fields on Done ({{last name}}, {{text: Unit}}, {{date}}), chips unlocked', typed.last && typed.unit && typed.date && !typed.left && typed.unlocked, JSON.stringify(typed));

  // ---- 4. Formatting survives fill, HTML export, Save As --------------------
  await t.eval(`document.querySelectorAll('[data-fill-field="amount"][data-fill-label="Back Rent"]').forEach(e => e.textContent = '450.00')`);
  s.check('bold field stays bold when filled', (await t.eval(TOK(`${P} [data-fill-field="amount"][data-fill-label="Back Rent"]`))).bold);
  const html = (await exportAs(t, 'html', 1500)).map(b => b.buf.toString('utf-8')).join('');
  const BOLD_AMT = /<b><span[^>]*data-fill-field="amount"[^>]*>450\.00<\/span><\/b>/;
  s.check('bold field is bold in the HTML export', BOLD_AMT.test(html));
  const sid = await saveAs(t, 'Field keys test');
  s.check('bold field is bold in the Save As copy', sid && BOLD_AMT.test(await savedHtml(t, sid)));
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }

// ---- 5. Full address: ", Apt 2" only when there is one (screen + print); Insert Field button + Undo
const a = await open(url('Letterhead.html'));
try {
  await a.eval(`document.getElementById('tt-edit-btn').click()`); await a.wait(400);
  await a.eval(LINE);
  await a.eval(`document.querySelector('#lpr-insert-panel .lpr-ins-btn[data-preset="full_address"][data-ns="contact"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))`);
  await a.wait(100);
  const ins = await a.eval(`(() => { const w = document.querySelector('.sheet .lpr-full-addr'); return w ? { n: w.querySelectorAll('[data-contact-field]').length, locked: [...w.querySelectorAll('[data-contact-field]')].every(e => e.getAttribute('contenteditable') === 'false') } : null; })()`);
  s.check('Insert Field → Full Address inserts the 5-field address, chips locked', ins && ins.n === 5 && ins.locked, JSON.stringify(ins));
  await a.eval(BTN('undo')); await a.wait(100);
  s.check('one Undo removes the whole address', await a.eval(`!document.querySelector('.sheet .lpr-full-addr')`));
  await a.eval(BTN('redo')); await a.wait(100);
  await DONE(a);
  const FILL = l2 => `(() => { const v = { address_line1: '1 Test St', address_line2: ${JSON.stringify(l2)}, city: 'Testville', state: 'MD', zip: '21000' };
    document.querySelectorAll('.lpr-full-addr [data-contact-field]').forEach(e => e.textContent = v[e.dataset.contactField]); return document.querySelector('.lpr-full-addr').innerText; })()`;
  s.check('full address without line 2: "1 Test St, Testville, MD 21000"', (await a.eval(FILL(''))) === '1 Test St, Testville, MD 21000', await a.eval(FILL('')));
  s.check('full address with line 2: "1 Test St, Apt 2, Testville, MD 21000"', (await a.eval(FILL('Apt 2'))) === '1 Test St, Apt 2, Testville, MD 21000', await a.eval(FILL('Apt 2')));
  await a.eval(FILL(''));
  await a.send('Emulation.setEmulatedMedia', { media: 'print' });
  s.check('print: ", Apt 2" part hidden when empty', await a.eval(`getComputedStyle(document.querySelector('.lpr-addr2-part')).display === 'none'`));
  await a.send('Emulation.setEmulatedMedia', { media: '' });
  s.check('no console errors', a.logs.length === 0, a.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await a.close(); }

// ---- 6. Legend: file in sync, AI formatting rule, Copy + Download (index page) --
const x = await open(url('index.html'));
try {
  const text = await x.eval('LPR_KEYS.legendText()');
  let file = ''; try { file = readFileSync(LEGEND_FILE, 'utf-8'); } catch {}
  s.check('FIELD-KEYS.md matches the key table (regenerate: node tests/keys.test.mjs --write)', file.replace(/\r\n/g, '\n') === text);
  s.check('legend states that formatting carries over, with examples', /FORMATTING CARRIES OVER/.test(text) && /\*\*\{\{landlord\}\}\*\*/.test(text) && /\*\{\{date: Move-out Date\}\}\*/.test(text));
  s.check('AI instructions tell it to bold/italicize the KEY for a bold/italic value', /To make a filled-in value bold or italic, format the KEY itself/.test(text));
  s.check('legend explains recipient vs tenant vs vendor', /SAME NAME, DIFFERENT PERSON/.test(text) && /\{\{vendor phone\}\}/.test(text));
  await x.eval(`(() => { window.__copied = null; navigator.clipboard.writeText = t => { window.__copied = t; return Promise.resolve(); };
    window.__blobs = []; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = b => { __blobs.push(b); return o(b); }; })()`);
  await x.eval(`document.querySelector('#field-keys-actions [data-keys="copy"]').click()`); await x.wait(100);
  s.check('index: Copy field keys puts the legend on the clipboard', (await x.eval('window.__copied')) === text);
  await x.eval(`document.querySelector('#field-keys-actions [data-keys="download"]').click()`); await x.wait(200);
  s.check('index: Download .txt makes the legend file (captured in memory, nothing saved)', (await x.eval(`(async () => __blobs.length ? await __blobs[0].text() : '')()`)) === text);
  s.check('no console errors', x.logs.length === 0, x.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await x.close(); }
s.done();
