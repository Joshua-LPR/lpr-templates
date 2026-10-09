// window.LPR_UTIL (user.js) must give EXACTLY the answers of the code it
// replaced — saved settings in localStorage are keyed by these values.
// The reference formulas below are verbatim copies of the pre-2026-10-08
// inline code (mode-bar.js / fill-fields.js / manual-address.js PAGE_KEY,
// the inline legacy-mode blocks' basename, employee.js / template-tools.js
// signature-offset file key, and the eight esc() copies).
import { open } from './lib/cdp.mjs';
import { url, suite, templates } from './lib/site.mjs';

const s = suite('Shared helpers — LPR_UTIL');
const REFERENCE = `(() => {
  var oldBase = (location.pathname.split('/').pop() || 'page').replace(/\\.html?$/i, '');
  var oldKey = (function () {
    var basename = (location.pathname.split('/').pop() || 'page').replace(/\\.html?$/i, '');
    if (basename === 'view') {
      var id = new URLSearchParams(location.search).get('id');
      if (id) {
        var sanitized = String(id).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        if (sanitized) return basename + '_' + sanitized;
      }
    }
    return basename;
  })();
  var oldFile = (location.pathname.split("/").pop() || "default").toLowerCase();
  var U = window.LPR_UTIL;
  return { has: !!U, base: [oldBase, U && U.pageBase()], key: [oldKey, U && U.pageKey()], file: [oldFile, U && U.fileKey()],
           viewCheck: [location.pathname.split('/').pop() === 'view.html', U && U.pageFile() === 'view.html'] };
})()`;

const t = await open(url('index.html'));
try {
  const pages = templates().map(x => url(x.id)).concat(
    ['index.html', 'archive.html', 'users.html'].map(p => url(p)),   // style-guide.html loads no scripts
    [url('view.html', '?id=c_mv0cxx3b'), url('view.html', '?id=C_Weird ID!!'), url('view.html', '?id=___'), url('view.html'), url('view.html', '?id=')]);
  const bad = [];
  for (const p of pages) {
    await t.goto(p, 900);
    // Under a full run a page can be slow: wait up to ~5 s for user.js.
    for (let i = 0; i < 20 && !(await t.eval(`!!window.LPR_UTIL`)); i++) await t.wait(200);
    const r = await t.eval(REFERENCE);
    const label = decodeURIComponent(p.split('/').pop());
    if (!r.has) { bad.push(label + ': LPR_UTIL missing'); continue; }
    for (const k of ['base', 'key', 'file', 'viewCheck']) if (r[k][0] !== r[k][1]) bad.push(`${label} ${k}: old=${r[k][0]} new=${r[k][1]}`);
  }
  s.check(`page-key helpers identical to the old formulas on ${pages.length} pages`, bad.length === 0, bad.join(' | '));

  await t.goto(url('Letterhead.html'));
  const e = await t.eval(`(() => { const E = LPR_UTIL.esc;
    const old = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const cases = ['plain', 'a & b', '<b>x</b>', 'say "hi"', "O'Brien", '', null, undefined, 0, 123, 'a&amp;b'];
    const out = cases.map(c => [c, E(c)]);
    // Old esc() never escaped apostrophes; the new one does. Rendered text and attribute values must be identical.
    const div = document.createElement('div');
    const render = cases.map(c => { div.innerHTML = '<span title="' + E(c) + '">' + E(c) + '</span>'; const a = [div.firstChild.textContent, div.firstChild.title];
                                    div.innerHTML = '<span title="' + old(c) + '">' + old(c) + '</span>'; const b = [div.firstChild.textContent, div.firstChild.title]; return a[0] === b[0] && a[1] === b[1]; });
    return { out, renderSame: render.every(Boolean) }; })()`);
  const want = { 'a & b': 'a &amp; b', '<b>x</b>': '&lt;b&gt;x&lt;/b&gt;', 'say "hi"': 'say &quot;hi&quot;', "O'Brien": 'O&#39;Brien', 'a&amp;b': 'a&amp;amp;b' };
  const escBad = e.out.filter(([c, v]) => (c in want ? want[c] : (c == null ? '' : String(c))) !== v);
  s.check('esc(): & < > " \' escaped; null/undefined → ""; numbers → text', escBad.length === 0, JSON.stringify(escBad));
  s.check('esc(): renders exactly like the old copies (text + attribute values)', e.renderSame);
  const tok = await t.eval(`({ attrs: LPR_UTIL.TOKEN_ATTRS.join(','), all: LPR_UTIL.TOKEN_SEL, fill: LPR_UTIL.FILL_TOKEN_SEL })`);
  s.check('token lists: all six field types; fill-in subset excludes employee/owner',
    tok.attrs === 'data-fill-field,data-tenant-field,data-contact-field,data-employee-field,data-owner-field,data-vendor-field' &&
    !/employee|owner/.test(tok.fill) && /fill-field/.test(tok.fill) && /contact-field/.test(tok.fill) && /tenant-field/.test(tok.fill) && /vendor-field/.test(tok.fill), JSON.stringify(tok));
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (err) { s.crash(err); }
finally { await t.close(); s.done(); }
