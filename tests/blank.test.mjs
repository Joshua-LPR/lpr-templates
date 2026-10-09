// Blank forms (brand.css "Blank forms"): on paper / in PDF+PNG exports an
// EMPTY field prints as a write-in line sized for what goes there.
import { open } from './lib/cdp.mjs';
import { url, suite } from './lib/site.mjs';

const s = suite('Blank forms — empty fields print as write-in lines');
const IN = 96;  // CSS px per inch
const t = await open(url('Letterhead.html'));
try {
  await t.eval(`localStorage.setItem('lpr_sigopt_letterhead.html', JSON.stringify({ mode: 'line', tenants: '1' }))`); await t.reload(2500);
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(400);
  await t.eval(`(() => { const so = document.querySelector('.sheet[data-flow] .lh-body .signoff'); const p = document.createElement('p'); p.id = 'zb';
    p.textContent = 'Rent {{amount: Back Rent}} due {{date: Due}} / {{numeric date: N}} / {{weekday date: W}} / {{short date: S}} / {{legal date: L}} at {{time: T}}, unit {{text: U}}, to {{landlord}}.'; so.before(p); })()`);
  await t.eval(`document.getElementById('tt-edit-btn').click()`); await t.wait(600);
  // Print Blank's state: every fill-in + recipient field empty.
  await t.eval(`document.querySelectorAll('[data-fill-field],[data-contact-field],[data-tenant-field]').forEach(e => e.textContent = '')`);
  const MEASURE = `(() => { const one = sel => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e), b = getComputedStyle(e, '::before');
      return { w: Math.round(e.getBoundingClientRect().width), border: cs.borderBottomStyle, before: b.display === 'none' ? '' : b.content }; };
    return { due: one('#zb [data-fill-label="Due"]'), n: one('#zb [data-fill-label="N"]'), w: one('#zb [data-fill-label="W"]'), sh: one('#zb [data-fill-label="S"]'),
      legal: one('#zb [data-fill-label="L"]'), time: one('#zb [data-fill-label="T"]'), amt: one('#zb [data-fill-label="Back Rent"]'), text: one('#zb [data-fill-label="U"]'),
      landlord: one('#zb [data-tenant-field="landlord"]'), dateLine: one('.sheet .date [data-fill-field]'), state: one('.recipient [data-contact-field="state"]'),
      zip: one('.recipient [data-contact-field="zip"]'), sigName: one('.sig-name [data-contact-field]'),
      addr2Hidden: getComputedStyle(document.querySelector('.recipient .lh-addr2')).display === 'none' }; })()`;

  // Screen: unchanged — no write-in lines (the faint labels show instead).
  const scr = await t.eval(MEASURE);
  s.check('on screen: no write-in lines (unchanged)', scr.due.border !== 'solid' && scr.amt.border !== 'solid', JSON.stringify({ due: scr.due, amt: scr.amt }));

  for (const how of ['print', 'PDF/PNG export']) {
    if (how === 'print') await t.send('Emulation.setEmulatedMedia', { media: 'print' });
    else { await t.send('Emulation.setEmulatedMedia', { media: '' }); await t.eval(`document.body.classList.add('tt-rastering')`); }
    await t.wait(200);
    const m = await t.eval(MEASURE);
    const near = (x, inches) => x && x.border === 'solid' && Math.abs(x.w - inches * IN) <= 3;
    s.check(`${how}: date lines sized per format (spelled 1.6in, numeric 1in, weekday 2.5in, short 1.2in)`,
      near(m.due, 1.6) && near(m.n, 1) && near(m.w, 2.5) && near(m.sh, 1.2), JSON.stringify([m.due, m.n, m.w, m.sh]));
    s.check(`${how}: legal date prints "the ___ day of ___, 20___"`, /the _+ day of _+, 20_+/.test(m.legal.before || '') && m.legal.border !== 'solid', JSON.stringify(m.legal));
    s.check(`${how}: time / text / landlord lines`, near(m.time, 0.9) && near(m.text, 1.6) && near(m.landlord, 2.4), JSON.stringify([m.time, m.text, m.landlord]));
    s.check(`${how}: amount with no "$" in the letter prints "$____"`, m.amt.border === 'solid' && m.amt.before === '"$"', JSON.stringify(m.amt));
    s.check(`${how}: date line + recipient (state 0.45in, zip 0.8in) get lines`, near(m.dateLine, 1.6) && near(m.state, 0.45) && near(m.zip, 0.8), JSON.stringify([m.dateLine, m.state, m.zip]));
    s.check(`${how}: signature rows untouched (no extra line under the tenant line); address line 2 row stays hidden`,
      (!m.sigName || m.sigName.border !== 'solid') && m.addr2Hidden, JSON.stringify({ sigName: m.sigName, addr2Hidden: m.addr2Hidden }));
  }
  await t.eval(`document.body.classList.remove('tt-rastering')`);
  await t.send('Emulation.setEmulatedMedia', { media: 'print' });
  // A filled field prints as normal text — no line.
  await t.eval(`document.querySelector('#zb [data-fill-label="Due"]').textContent = 'October 8, 2026'`);
  const filled = await t.eval(`getComputedStyle(document.querySelector('#zb [data-fill-label="Due"]')).borderBottomStyle`);
  s.check('a filled field prints as plain text (no line)', filled !== 'solid', filled);
  await t.send('Emulation.setEmulatedMedia', { media: '' });
  await t.eval(`localStorage.removeItem('lpr_sigopt_letterhead.html')`);
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); }

// An amount whose "$" is written in the template must NOT get a second one.
const r = await open(url('Rent Increase Notice.html'));
try {
  await r.eval(`document.querySelectorAll('[data-fill-field]').forEach(e => e.textContent = '')`);
  await r.send('Emulation.setEmulatedMedia', { media: 'print' }); await r.wait(200);
  const nr = await r.eval(`(() => { const e = document.querySelector('[data-fill-label="New Rent"]'); const b = getComputedStyle(e, '::before');
    return { border: getComputedStyle(e).borderBottomStyle, before: b.display === 'none' ? '' : b.content }; })()`);
  s.check('Rent Increase: "$" already in the letter → line with no second "$"', nr.border === 'solid' && nr.before !== '"$"', JSON.stringify(nr));
  s.check('no console errors', r.logs.length === 0, r.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await r.close(); }

// Envelopes / labels / cards are not forms: no write-in lines there.
const v = await open(url('Envelope.html'));
try {
  await v.eval(`document.querySelectorAll('[data-contact-field]').forEach(e => e.textContent = '')`);
  await v.send('Emulation.setEmulatedMedia', { media: 'print' }); await v.wait(200);
  const lines = await v.eval(`[...document.querySelectorAll('[data-contact-field]')].filter(e => getComputedStyle(e).borderBottomStyle === 'solid').length`);
  s.check('Envelope (not a letter): empty fields print no lines', lines === 0, 'lines=' + lines);
} catch (e) { s.crash(e); }
finally { await v.close(); }
s.done();
