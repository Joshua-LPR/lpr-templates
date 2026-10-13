// Security Deposit: the math is automatic (fill-fields.js data-fill-calc) and
// the wording is formal (no em dashes, no 14-day dispute window).
import { open } from './lib/cdp.mjs';
import { url, suite, openSetupTab } from './lib/site.mjs';

const s = suite('Security Deposit — automatic math + wording');
const t = await open(url('Security Deposit.html'));
const SET = (key, v) => `(() => { const i = document.querySelector('[data-ff-key="${key}"]'); i.value = '${v}'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); })()`;
const LETTER = `(() => { const v = l => [...document.querySelectorAll('.sheet [data-fill-label="' + l + '"]')].map(e => e.textContent);
  return { refund: v('Refund Amount'), balance: v('Balance Due'), full: [...document.querySelectorAll('.sheet [data-fill-key="refund_amount_full"]')].map(e => e.textContent) }; })()`;
const BOXES = `(() => { const b = k => { const i = document.querySelector('[data-ff-calc="' + k + '"]'); const n = document.querySelector('[data-ff-note="' + k + '"]');
  return i ? { v: i.value, ro: i.readOnly, note: n ? n.textContent : '' } : null; };
  return { refund: b('refund_amount'), balance: b('balance_due'), full: b('refund_amount_full'), formula: (document.querySelector('[data-ff-calc="refund_amount"]')?.closest('.lpr-ff-field')?.querySelector('.lpr-ff-formula') || {}).textContent }; })()`;
try {
  await t.eval(`localStorage.removeItem('lpr_fill_' + LPR_UTIL.pageKey())`); await t.reload(2500);
  await openSetupTab(t, 'Fields'); await t.wait(800);
  let b = await t.eval(BOXES);
  s.check('Fields tab: Refund Amount, Balance Due, Full Refund Amount are read-only with their formula', b.refund?.ro && b.balance?.ro && b.full?.ro && /Deposit Held \+ Accrued Interest − Total Deductions/.test(b.formula || ''), JSON.stringify(b));
  s.check('blank until the inputs are filled', b.refund.v === '' && (await t.eval(LETTER)).refund.every(x => x === ''));

  await t.eval(SET('deposit_held', '1500')); await t.eval(SET('accrued_interest', '12.34')); await t.eval(SET('total_deductions', '400'));
  let L = await t.eval(LETTER); b = await t.eval(BOXES);
  s.check('Partial: refund = 1,500 + 12.34 − 400 = 1,112.34, in both places on the letter', L.refund.length === 2 && L.refund.every(x => x === '1,112.34'), JSON.stringify(L.refund));
  s.check('Full: refund = deposit + interest = 1,512.34', L.full.every(x => x === '1,512.34'), JSON.stringify(L.full));
  s.check('Withheld with these numbers: balance is negative → note says use Partial Refund', /Partial Refund/.test(b.balance.note) && b.refund.note === '', JSON.stringify(b));
  const line = await t.eval(`document.querySelector('.sheet:not(.mode-hidden) [data-fill-label="Deposit Held"], .sheet [data-fill-label="Refund Amount"]').closest('p, td').textContent`);
  s.check('no doubled "$" next to a calculated amount', !/\$\$/.test(line), line);

  await t.eval(SET('total_deductions', '2000'));
  L = await t.eval(LETTER); b = await t.eval(BOXES);
  s.check('deductions 2,000 → balance due 487.66 on the Withheld letter; refund note says use Withheld', L.balance.every(x => x === '487.66') && /Withheld/.test(b.refund.note), JSON.stringify({ bal: L.balance, note: b.refund.note }));

  await t.reload(2500);
  L = await t.eval(LETTER);
  s.check('calculated amounts are back after a reload', L.balance.every(x => x === '487.66') && L.full.every(x => x === '1,512.34'), JSON.stringify(L));

  // Wording: formal, no em dash, no dispute window.
  const text = await t.eval(`[...document.querySelectorAll('.sheet')].map(s => s.textContent).join(' ')`);
  s.check('no em dashes in any of the three letters', !/—/.test(text));
  s.check('no "14 days" / "incorrect" dispute sentence', !/14 days|incorrect/i.test(text));
  s.check('formal wording: "We are pleased to inform you", "Enclosed please find", no "Good news"', /We are pleased to inform you/.test(text) && /Enclosed please find/.test(text) && !/Good news/i.test(text));
  const closers = await t.eval(`[...document.querySelectorAll('.sheet .signoff > p:first-child')].map(p => p.textContent.trim())`);
  s.check('every variant signs off "Sincerely,"', closers.length === 3 && closers.every(c => c === 'Sincerely,'), JSON.stringify(closers));
  await t.eval(`localStorage.removeItem('lpr_fill_' + LPR_UTIL.pageKey())`);
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }
s.done();
