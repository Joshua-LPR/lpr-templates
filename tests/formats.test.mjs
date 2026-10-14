// Phase 5: typed dates, per-field date formats, money formatting + smart "$",
// {{… date: …}} keys, and no date-picker popups in exports (bead bqt).
import { open } from './lib/cdp.mjs';
import { url, suite, openSetupTab, exportAs, saveAs, savedHtml } from './lib/site.mjs';

const s = suite('Date + money formats');
const t = await open(url('Rent Increase Notice.html'));
try {
  // ---- 1. Parsing + formatting (pure functions) ----------------------------
  const DATES = {
    '10/8/2026': '2026-10-08', '10-08-26': '2026-10-08', '10.8.2026': '2026-10-08', '2026-10-08': '2026-10-08',
    'October 8 2026': '2026-10-08', 'Oct 8, 2026': '2026-10-08', 'oct. 8th, 2026': '2026-10-08', 'Sept 8 2026': '2026-09-08',
    '8 Oct 2026': '2026-10-08', '8 October, 26': '2026-10-08', 'Thursday, October 8, 2026': '2026-10-08', 'Thu Oct 8 2026': '2026-10-08',
    'the 8th day of October, 2026': '2026-10-08', '1/5/2026': '2026-01-05',
    '2/30/2026': null, '13/1/2026': null, '10/8': null, 'hello': null, 'Octember 8 2026': null, '10/8/202': null,
  };
  const pd = await t.eval(`Object.fromEntries(Object.keys(${JSON.stringify(DATES)}).map(k => [k, LPR_FILL_FORMAT.parseDate(k)]))`);
  const badP = Object.keys(DATES).filter(k => pd[k] !== DATES[k]).map(k => `${k} → ${pd[k]} (want ${DATES[k]})`);
  s.check(`${Object.keys(DATES).length} typed dates parse (or are rejected) correctly`, !badP.length, badP.join('; '));

  const FMT = {
    spelled: 'January 5, 2026', numeric: '1/5/2026', weekday: 'Monday, January 5, 2026', short: 'Jan 5, 2026', legal: 'the 5th day of January, 2026',
  };
  const fd = await t.eval(`Object.fromEntries(Object.keys(LPR_FILL_FORMAT.DATE_FORMATS).map(f => [f, LPR_FILL_FORMAT.formatDate('2026-01-05', f)]))`);
  s.check('all five formats (numeric drops leading zeros)', JSON.stringify(fd) === JSON.stringify(FMT), JSON.stringify(fd));
  const ords = await t.eval(`['01','02','03','04','11','12','13','21','22','23','31'].map(d => LPR_FILL_FORMAT.formatDate('2026-10-' + d, 'legal').split(' ')[1])`);
  s.check('legal ordinals: 1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 23rd 31st', ords.join(' ') === '1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 23rd 31st', ords.join(' '));

  const MONEY = { '1234.5': '1,234.50', '$1,234.5': '1,234.50', '1200': '1,200.00', '0.5': '0.50', '.5': '0.50', '1234567': '1,234,567.00', ' $ 950 ': '950.00', 'TBD': 'TBD', '': '' };
  const mf = await t.eval(`Object.fromEntries(Object.keys(${JSON.stringify(MONEY)}).map(k => [k, LPR_FILL_FORMAT.formatMoney(k)]))`);
  const badM = Object.keys(MONEY).filter(k => mf[k] !== MONEY[k]).map(k => `"${k}" → "${mf[k]}"`);
  s.check('money: commas + always 2 decimals; "TBD" kept', !badM.length, badM.join('; '));

  // ---- 2. Fields tab: typing dates, bad input, per-field format -------------
  await openSetupTab(t, 'Fields');
  await t.wait(800);                                                           // flatpickr loads
  const ALT = key => `document.querySelector('[data-ff-key="${key}"]')._flatpickr.altInput`;
  const TYPE = (key, text) => `(() => { const a = ${ALT(key)}; a.focus(); a.value = ${JSON.stringify(text)};
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })); a.blur(); })()`;
  const LETTER = label => `[...document.querySelectorAll('.sheet [data-fill-label="${label}"]')].map(e => e.textContent)`;
  await t.eval(TYPE('notice_date', '10/8/2026')); await t.wait(200);
  s.check('typed "10/8/2026" → letter shows "October 8, 2026"', (await t.eval(LETTER('Notice Date'))).every(x => x === 'October 8, 2026'), JSON.stringify(await t.eval(LETTER('Notice Date'))));
  await t.eval(TYPE('notice_date', 'Oct 9 26')); await t.wait(200);
  s.check('typed "Oct 9 26" → "October 9, 2026"', (await t.eval(LETTER('Notice Date')))[0] === 'October 9, 2026');
  await t.eval(TYPE('notice_date', 'next tuesday-ish')); await t.wait(200);
  const bad = await t.eval(`({ red: ${ALT('notice_date')}.classList.contains('lpr-ff-bad'), letter: (${LETTER('Notice Date')})[0] })`);
  s.check('unreadable date → red outline, letter keeps "October 9, 2026"', bad.red && bad.letter === 'October 9, 2026', JSON.stringify(bad));
  await t.eval(TYPE('notice_date', 'October 9, 2026')); await t.wait(200);

  await t.eval(`(() => { const s = document.querySelector('[data-ff-fmt="notice_date"]'); s.value = 'numeric'; s.dispatchEvent(new Event('change')); })()`); await t.wait(300);
  const num = await t.eval(`({ text: (${LETTER('Notice Date')})[0], attr: document.querySelector('.sheet [data-fill-label="Notice Date"]').getAttribute('data-fill-shown'),
    other: (${LETTER('Renewal Date')})[0] })`);
  s.check('Notice Date set to numeric → "10/9/2026"; other dates unaffected (per field)', num.text === '10/9/2026' && num.attr === 'numeric' && !/\//.test(num.other || ''), JSON.stringify(num));
  await t.eval(`(() => { const s = document.querySelector('[data-ff-fmt="notice_date"]'); s.value = 'weekday'; s.dispatchEvent(new Event('change')); })()`); await t.wait(300);
  s.check('weekday format → "Friday, October 9, 2026"', (await t.eval(LETTER('Notice Date')))[0] === 'Friday, October 9, 2026');
  await t.reload(2500);
  s.check('format + date remembered after reload', (await t.eval(LETTER('Notice Date')))[0] === 'Friday, October 9, 2026', (await t.eval(LETTER('Notice Date')))[0]);

  // ---- 2b. Picker UI (Joshua 2026-10-14): pattern names, Today, live typing --
  await openSetupTab(t, 'Fields'); await t.wait(800);
  const opts = await t.eval(`[...document.querySelectorAll('[data-ff-fmt="notice_date"] option')].map(o => o.textContent)`);
  s.check('format dropdown shows THIS field\'s date in each format, labelled "Format"', opts.includes('10/9/2026') && opts.includes('the 9th day of October, 2026') && opts.includes('Friday, October 9, 2026')
    && (await t.eval(`document.querySelector('[data-ff-fmt="notice_date"]').parentNode.querySelector('.lpr-ff-fmt-lbl').textContent`)) === 'Format', JSON.stringify(opts));
  const mcol = await t.eval(`(() => { const o = document.querySelector('.flatpickr-monthDropdown-months option'); return o ? getComputedStyle(o).color : null; })()`);
  s.check('month dropdown list is dark text (not white on grey)', mcol === 'rgb(27, 31, 59)', mcol);
  // real keystrokes: click the box, type, look at the hint + calendar, then Tab
  const r = await t.eval(`(() => { const b = ${ALT('notice_date')}.getBoundingClientRect(); return { x: b.x + 20, y: b.y + b.height / 2 }; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) await t.send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
  await t.wait(200); await t.eval(`${ALT('notice_date')}.select()`);
  await t.send('Input.insertText', { text: '5/1/2000' }); await t.wait(200);
  const live = await t.eval(`(() => { const fp = document.querySelector('[data-ff-key="notice_date"]')._flatpickr; return { hint: fp._lprHint.textContent, month: fp.currentMonth, year: fp.currentYear }; })()`);
  s.check('typing "5/1/2000": hint shows how it will read; calendar jumps to May 2000', /Will show as: Monday, May 1, 2000/.test(live.hint) && live.month === 4 && live.year === 2000, JSON.stringify(live));
  for (const type of ['keyDown', 'keyUp']) await t.send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await t.wait(400);
  const typed = await t.eval(`({ box: ${ALT('notice_date')}.value, letter: (${LETTER('Notice Date')})[0] })`);
  s.check('format examples follow the new date', (await t.eval(`[...document.querySelectorAll('[data-ff-fmt="notice_date"] option')].map(o => o.textContent)`)).includes('5/1/2000'));
  s.check('Tab out → box AND letter switch to the field format ("Monday, May 1, 2000")', typed.box === 'Monday, May 1, 2000' && typed.letter === 'Monday, May 1, 2000', JSON.stringify(typed));
  await t.eval(`(() => { const fp = document.querySelector('[data-ff-key="notice_date"]')._flatpickr; fp.open(); fp.calendarContainer.querySelector('.lpr-fp-today').click(); })()`); await t.wait(300);
  const today = await t.eval(`(() => { const d = new Date(); return { want: LPR_FILL_FORMAT.formatDate(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), 'weekday'), got: (${LETTER('Notice Date')})[0], open: document.querySelector('[data-ff-key="notice_date"]')._flatpickr.isOpen }; })()`);
  s.check('Today button sets today and closes the calendar', today.got === today.want && !today.open, JSON.stringify(today));
  await t.eval(TYPE('notice_date', 'October 9, 2026')); await t.wait(200);

  // ---- 3. Money in the Fields tab: "$" already in the letter ----------------
  await openSetupTab(t, 'Fields'); await t.wait(800);
  const MONEYIN = (key, v) => `(() => { const i = document.querySelector('[data-ff-key="${key}"]'); i.value = ${JSON.stringify(v)};
    i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); return i.value; })()`;
  const box = await t.eval(MONEYIN('new_rent', '$1234.5'));
  const nr = await t.eval(`(() => { const e = document.querySelector('.sheet [data-fill-label="New Rent"]'); return { span: e.textContent, line: e.parentElement.textContent.replace(/\\s+/g, ' ').trim() }; })()`);
  s.check('money box tidied to "1,234.50" on leaving it', box === '1,234.50', box);
  s.check('letter already has "$" before New Rent → "$1,234.50", no "$$"', nr.span === '1,234.50' && /\$1,234\.50/.test(nr.line) && !/\$\$/.test(nr.line), JSON.stringify(nr));
  await t.eval(MONEYIN('new_rent', 'TBD'));
  s.check('"TBD" stays as typed (no "$" added)', (await t.eval(`document.querySelector('.sheet [data-fill-label="New Rent"]').textContent`)) === 'TBD');
  s.check('no console errors', t.logs.filter(l => !/^dialog beforeunload/.test(l)).length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }

// ---- 4. Letterhead: "$" added where the letter has none; keys set the format; exports clean
const L = await open(url('Letterhead.html'));
try {
  await L.eval(`document.getElementById('tt-edit-btn').click()`); await L.wait(400);
  await L.eval(`(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); const p = document.createElement('p'); p.id = 'zf';
    p.textContent = 'Deposit {{amount: Deposit}} due {{weekday date: Move Out}}, signed {{legal date: Signing}}, and $ {{amount: Fee}}. Again: {{numeric date: Move Out}}.'; b.querySelector('.signoff').before(p); })()`);
  await L.eval(`document.getElementById('tt-edit-btn').click()`); await L.wait(500);
  const keyFmt = await L.eval(`({ w: document.querySelector('#zf [data-fill-label="Move Out"]')?.getAttribute('data-fill-format'), l: document.querySelector('#zf [data-fill-label="Signing"]')?.getAttribute('data-fill-format') })`);
  s.check('{{weekday date: …}} / {{legal date: …}} keys set the field\'s format', keyFmt.w === 'weekday' && keyFmt.l === 'legal', JSON.stringify(keyFmt));
  await openSetupTab(L, 'Fields'); await L.wait(800);
  s.check('one date in two formats (two keys, same label): dropdown says "Different in each place"', (await L.eval(`document.querySelector('[data-ff-fmt="move_out"]').value`)) === '');
  await L.eval(`(() => { for (const [k, v] of [['deposit', '750'], ['fee', '25']]) { const i = document.querySelector('[data-ff-key="' + k + '"]'); i.value = v; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); } })()`);
  for (const [k, v] of [['move_out', '10/8/2026'], ['signing', '10/1/2026']]) {
    await L.eval(`(() => { const a = document.querySelector('[data-ff-key="${k}"]')._flatpickr.altInput; a.focus(); a.value = '${v}'; a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })); a.blur(); })()`);
  }
  await L.wait(300);
  const line = await L.eval(`document.getElementById('zf').textContent.replace(/\\s+/g, ' ')`);
  s.check('"$" added where the letter has none, not where it has one; formats applied',
    line === 'Deposit $750.00 due Thursday, October 8, 2026, signed the 1st day of October, 2026, and $ 25.00. Again: 10/8/2026.', line);
  const SETF = v => L.eval(`(() => { const s = document.querySelector('[data-ff-fmt="move_out"]'); s.value = '${v}'; s.dispatchEvent(new Event('change')); })()`);
  const MO = `[...document.querySelectorAll('#zf [data-fill-label="Move Out"]')].map(e => e.textContent).join(' / ')`;
  await SETF('short'); await L.wait(300);
  s.check('dropdown sets ALL places of the date at once', (await L.eval(MO)) === 'Oct 8, 2026 / Oct 8, 2026', await L.eval(MO));
  await SETF(''); await L.wait(300);
  s.check('"Different in each place" gives each place its own format back', (await L.eval(MO)) === 'Thursday, October 8, 2026 / 10/8/2026', await L.eval(MO));
  // The tenant's rent (tenant field) gets the same money formatting.
  const rent = await L.eval(`(() => { const p = document.createElement('p'); p.id = 'zr'; p.innerHTML = 'Rent <span data-tenant-field="rent_amount"></span>; or $<span data-tenant-field="rent_amount"></span>.';
    document.getElementById('zf').after(p); LPR_TENANTS.applyTenant({ effective: { rent_amount: '1200' } }); const t = p.textContent; p.remove(); return t; })()`);
  s.check('tenant rent "1200" → "$1,200.00" (and no "$$" after a written "$")', rent === 'Rent $1,200.00; or $1,200.00.', rent);
  const pops = await L.eval(`document.querySelectorAll('.flatpickr-calendar').length`);
  const html = (await exportAs(L, 'html', 1500)).map(b => b.buf.toString('utf-8')).join('');
  s.check('HTML export has no date-picker popups (bqt) but keeps the formatted dates', pops > 0 && !/flatpickr-calendar/.test(html) && /Thursday, October 8, 2026/.test(html), 'popups on page: ' + pops);
  const id = await saveAs(L, 'Formats test');
  const saved = id ? await savedHtml(L, id) : '';
  s.check('Save As copy has no date-picker popups and keeps data-fill-format', !/flatpickr-calendar/.test(saved) && /data-fill-format="weekday"/.test(saved));
  s.check('no console errors', L.logs.length === 0, L.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await L.close(); }
s.done();
