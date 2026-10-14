// Callout markers [!blue] / [!gold] / [!red] (field-keys.js, Joshua 2026-10-14):
// a paragraph starting with one becomes that style-guide callout box; GitHub-
// style alerts (> [!WARNING] then > lines) work too. FAKE data only.
import { open } from './lib/cdp.mjs';
import { url, suite } from './lib/site.mjs';

const s = suite('Callout markers [!blue] / [!gold] / [!red]');
const PASTE = text => `(() => { const b = [...document.querySelectorAll('.sheet .lh-body')].find(x => x.offsetHeight > 0); const p = document.createElement('p'); p.innerHTML = '<br>';
  b.querySelector('.signoff').before(p); [...document.querySelectorAll('.sheet')].find(x => x.offsetHeight > 0).focus();
  const r = document.createRange(); r.setStart(p, 0); r.collapse(true); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  const dt = new DataTransfer(); dt.setData('text/plain', ${JSON.stringify(text)}); p.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); })()`;
const EDIT = t => t.eval(`document.getElementById('tt-edit-btn').click()`).then(() => t.wait(400));
const DONE = async t => { await EDIT(t); await t.eval(`(() => { const k = document.querySelector('.tt-backdrop [data-act="keep"]'); if (k) k.click(); })()`); await t.wait(300); };
const BOXES = `[...document.querySelectorAll('.sheet .callout')].filter(c => c.offsetHeight > 0).map(c => ({ cls: c.className, text: c.textContent.replace(/\\s+/g, ' ').trim(), html: c.innerHTML,
  tokens: c.querySelectorAll('[data-fill-field],[data-tenant-field],[data-contact-field]').length, boldToken: !!c.querySelector('strong [data-tenant-field], strong[data-tenant-field], [data-tenant-field][style*="bold"]'),
  bg: getComputedStyle(c).backgroundColor, border: getComputedStyle(c).borderLeftColor }))`;

const t = await open(url('Letterhead.html'));
try {
  await EDIT(t);
  await t.eval(PASTE([
    'Dear {{first name}},',
    '[!blue] Pay the balance by {{date: Due Date}}.',
    '[!gold] New monthly rent: **{{rent amount}}**',
    '[!red] Do not use the gas stove until the repair is complete.',
    '[!red] **Warning:** the smoke detector was disconnected.',
    '> [!WARNING]',
    '> Line one of the warning.',
    '> Line two of the warning.',
    'A normal paragraph after.',
    '[!sparkly] not a callout type',
  ].join('\n\n')));
  await t.wait(400);
  const b = await t.eval(BOXES);
  s.check('5 callout boxes made', b.length === 5, JSON.stringify(b.map(x => x.cls + ': ' + x.text)));
  const [blue, gold, red, red2, gh] = b;
  s.check('[!blue] → blue callout, marker gone, {{date: …}} inside is a live field', blue && /callout-blue/.test(blue.cls) && /^Pay the balance by/.test(blue.text) && !/\[!/.test(blue.html) && blue.tokens === 1, JSON.stringify(blue));
  s.check('[!gold] → gold callout; **{{key}}** stays a bold field', gold && /callout-gold/.test(gold.cls) && gold.tokens === 1 && /<(strong|b)>\s*<span data-tenant-field/.test(gold.html), JSON.stringify(gold));
  s.check('[!red] → red callout (#b23b3b border, #f8ecec background) with a bold "Important:" added', red && /callout-red/.test(red.cls) && /^Important: Do not use/.test(red.text) && red.border === 'rgb(178, 59, 59)' && red.bg === 'rgb(248, 236, 236)', JSON.stringify(red));
  s.check('red callout that already starts with **Warning:** gets no extra "Important:"; the lead word is red', red2 && /^Warning: the smoke/.test(red2.text), JSON.stringify(red2));
  s.check('lead word colour', (await t.eval(`getComputedStyle([...document.querySelectorAll('.sheet .callout-red')].filter(c => c.offsetHeight > 0)[1].firstElementChild).color`)) === 'rgb(178, 59, 59)');
  s.check('GitHub-style "> [!WARNING]" + "> " lines → ONE red callout holding both lines, no ">" left', gh && /callout-red/.test(gh.cls) && /Line one of the warning\. ?Line two of the warning\./.test(gh.text) && !/>/.test(gh.text.replace(/<[^>]+>/g, '')), JSON.stringify(gh));
  const rest = await t.eval(`(() => { const body = [...document.querySelectorAll('.sheet .lh-body')].find(x => x.offsetHeight > 0).textContent; return { after: /A normal paragraph after\\./.test(body), unknown: /\\[!sparkly\\] not a callout type/.test(body), stray: /^\\s*>/m.test(body) }; })()`);
  s.check('paragraph after stays normal; an unknown [!type] is left as written', rest.after && rest.unknown, JSON.stringify(rest));

  // typed in edit mode → converts on Done
  await t.eval(`(() => { const b = [...document.querySelectorAll('.sheet .lh-body')].find(x => x.offsetHeight > 0); const p = document.createElement('p'); p.textContent = '[!gold] Typed callout'; b.querySelector('.signoff').before(p); })()`);
  await DONE(t);
  const typed = await t.eval(`[...document.querySelectorAll('.sheet .callout-gold')].some(c => c.textContent.trim() === 'Typed callout')`);
  s.check('a marker typed in edit mode converts on Done', typed);
  const legend = await t.eval(`({ full: LPR_KEYS.legendText(), ai: LPR_KEYS.aiText() })`);
  s.check('legend + Copy for AI explain [!blue] / [!gold] / [!red]', /\[!blue\]/.test(legend.full) && /\[!red\]/.test(legend.full) && /\[!gold\]/.test(legend.ai) && /rarely/.test(legend.ai));
  s.check('no console errors', t.logs.filter(l => !/^dialog beforeunload/.test(l)).length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }
s.done();
