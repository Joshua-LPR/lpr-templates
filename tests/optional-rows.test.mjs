// Dismiss / restore optional rows (optional-rows.js) on the three notices that use them.
import { open } from './lib/cdp.mjs';
import { url, suite, exportAs, saveAs } from './lib/site.mjs';

const PAGES = {
  '24-Hour Notice.html':       { rows: ['reason', 'persons'], labels: ['Reason', 'Persons Entering'], start: [] },
  'Occupant Update.html':      { rows: ['occ1', 'occ2', 'occ3', 'occ4'], labels: ['Occupant 1', 'Occupant 2', 'Occupant 3', 'Occupant 4'], start: ['occ3', 'occ4'] },
  'Tenancy Confirmation.html': { rows: ['rent', 'hap', 'tenant-portion'], labels: ['Rent details', 'HAP Portion', 'Tenant Portion'], start: [] },
};
const s = suite('Optional rows');
const STATE = `(() => { const rows = {}; document.querySelectorAll('.opt-dismiss[data-opt-row]').forEach(b => { const id = b.dataset.optRow;
    const parts = [...document.querySelectorAll('[data-opt-row="' + id + '"]')].filter(e => e !== b);
    rows[id] = parts.every(e => !e.offsetParent) ? 'hidden' : parts.every(e => e.offsetParent) ? 'shown' : 'mixed'; });
  return { rows, bar: [...document.querySelectorAll('.opt-restore-btn')].map(b => b.textContent.trim()) }; })()`;
const click = sel => `(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (b) b.click(); return !!b; })()`;

for (const [page, cfg] of Object.entries(PAGES)) {
  const name = page.replace('.html', '');
  const t = await open(url(page));
  try {
    let st = await t.eval(STATE);
    const startBar = cfg.labels.filter((_, i) => cfg.start.includes(cfg.rows[i])).map(l => '＋ ' + l);
    s.check(`${name}: opens with the right rows hidden + listed`, cfg.rows.every(r => st.rows[r] === (cfg.start.includes(r) ? 'hidden' : 'shown')) && JSON.stringify(st.bar) === JSON.stringify(startBar), JSON.stringify(st));

    // Restore the start-hidden rows, then dismiss every row one at a time.
    for (const r of cfg.start) await t.eval(`(() => { const b = [...document.querySelectorAll('.opt-restore-btn')].find(b => b.textContent.includes(${JSON.stringify(cfg.labels[cfg.rows.indexOf(r)])})); b.click(); })()`);
    st = await t.eval(STATE);
    s.check(`${name}: restore brings start-hidden rows back`, cfg.rows.every(r => st.rows[r] === 'shown') && st.bar.length === 0, JSON.stringify(st));
    const leaf = cfg.rows.filter(r => r !== 'rent');            // rent contains the others; tested separately
    for (const r of leaf) await t.eval(click(`.opt-dismiss[data-opt-row="${r}"]`));
    st = await t.eval(STATE);
    s.check(`${name}: × hides each row`, leaf.every(r => st.rows[r] === 'hidden'), JSON.stringify(st));
    s.check(`${name}: restore bar lists exactly the dismissed rows, in order, with labels`,
      JSON.stringify(st.bar) === JSON.stringify(leaf.map(r => '＋ ' + cfg.labels[cfg.rows.indexOf(r)])), JSON.stringify(st.bar));

    await t.send('Emulation.setEmulatedMedia', { media: 'print' });
    // Invisible = not rendered, visibility:hidden, or zero-size (some print CSS keeps
    // the × column in the grid but invisible so the other columns don't shift).
    const pr = await t.eval(`(() => { const gone = e => !e.offsetParent || getComputedStyle(e).visibility === 'hidden' || (e.offsetWidth === 0 || e.offsetHeight === 0);
      return { ui: [...document.querySelectorAll('.opt-dismiss, .opt-restore-bar, .opt-restore-btn')].every(gone),
               rows: ${JSON.stringify(leaf)}.every(r => [...document.querySelectorAll('.opt-row-cell[data-opt-row="' + r + '"], .rent-block[data-opt-row="' + r + '"]')].every(e => !e.offsetParent)) }; })()`);
    await t.send('Emulation.setEmulatedMedia', { media: '' });
    s.check(`${name}: print — dismissed rows and the ×/restore controls don't print`, pr.ui && pr.rows, JSON.stringify(pr));
    const png = (await exportAs(t, 'png', 5000)).filter(b => b.type === 'image/png');
    s.check(`${name}: PNG export works with rows dismissed`, png.length >= 1, png.length);

    // Save As keeps the state; the copy's restore buttons work.
    const id = await saveAs(t, 'Optional rows ' + name);
    await t.goto(url('view.html', '?id=' + id), 2500);
    st = await t.eval(STATE);
    s.check(`${name}: Library copy reopens with the same rows hidden`, leaf.every(r => st.rows[r] === 'hidden') && st.bar.length === leaf.length, JSON.stringify(st));
    await t.eval(`document.querySelector('.opt-restore-btn').click()`);
    st = await t.eval(STATE);
    s.check(`${name}: Library copy restore buttons work (were dead before)`, st.rows[leaf[0]] === 'shown' && st.bar.length === leaf.length - 1, JSON.stringify(st));

    if (cfg.start.length) {
      // Restore a start-hidden row, save, reopen: it must stay visible (it used to be re-hidden).
      await t.goto(url(page));
      await t.eval(`(() => { const b = [...document.querySelectorAll('.opt-restore-btn')].find(b => b.textContent.includes('Occupant 3')); b.click(); })()`);
      const id2 = await saveAs(t, 'Occupant restored row 3');
      await t.goto(url('view.html', '?id=' + id2), 2500);
      st = await t.eval(STATE);
      s.check(`${name}: restored row 3 stays visible in the Library copy`, st.rows.occ3 === 'shown' && st.rows.occ4 === 'hidden', JSON.stringify(st));
    }
    if (cfg.rows.includes('rent')) {
      await t.goto(url(page));
      await t.eval(click('.opt-dismiss[data-opt-row="rent"]'));
      const blk = await t.eval(`({ block: !document.querySelector('.rent-block').offsetParent, bar: [...document.querySelectorAll('.opt-restore-btn')].map(b => b.textContent.trim()) })`);
      s.check(`${name}: "Rent details" × hides the whole rent block`, blk.block && JSON.stringify(blk.bar) === JSON.stringify(['＋ Rent details']), JSON.stringify(blk));
    }
    s.check(`${name}: no console errors`, t.logs.length === 0, t.logs.join(' || '));
  } catch (e) { s.crash(e); }
  finally { await t.close(); }
}
s.done();
