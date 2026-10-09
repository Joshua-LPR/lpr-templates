// HTML export + Save As snapshot preparation (template-tools.js), and Library copies.
import { open } from './lib/cdp.mjs';
import { url, suite, exportAs, saveAs, savedHtml, pdfPageCount, ARTIFACTS, REPO } from './lib/site.mjs';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const s = suite('Snapshots — HTML export, Save As, Library copies');
const DIR = pathToFileURL(REPO).href + '/';
const t = await open(url('Rent Increase Notice.html'));
try {
  // ---- Save As: one correct <base>, absolute asset URLs ----
  const id = await saveAs(t, 'Snapshot test');
  const saved = await savedHtml(t, id);
  const bases = saved.match(/<base href="([^"]*)"/g) || [];
  s.check('Save As: exactly one <base>, pointing at the templates folder', bases.length === 1 && bases[0] === `<base href="${DIR}"`, JSON.stringify(bases));
  const rel = [...saved.matchAll(/\s(?:src|href)="([^"]*)"/g)].map(m => m[1]).filter(v => !/^(?:https?:|file:|data:|blob:|mailto:|tel:|#|\/)/.test(v));
  s.check('Save As: no relative asset URLs left', rel.length === 0, JSON.stringify(rel.slice(0, 5)));
  const doubled = [...saved.matchAll(/\s(?:src|href)="([^"]*)"/g)].map(m => m[1]).filter(v => (v.match(/file:\/\//g) || []).length > 1);
  s.check('Save As: no doubled file:// URLs', doubled.length === 0, JSON.stringify(doubled.slice(0, 3)));

  // ---- Library copy: exports work (they failed while <base> was doubled) ----
  await t.goto(url('view.html', '?id=' + id), 2800);
  const pdf = (await exportAs(t, 'pdf')).find(b => b.type === 'application/pdf');
  s.check('Library copy: Export → PDF works', pdf && pdfPageCount(pdf.buf) >= 1, pdf ? pdfPageCount(pdf.buf) : 'no PDF — ' + t.logs.join(' | '));
  const png = (await exportAs(t, 'png', 5000)).filter(b => b.type === 'image/png');
  s.check('Library copy: Export → PNG works', png.length >= 1, png.length);

  // ---- An OLD Library copy (saved with the doubled <base>) is repaired on open ----
  const oldEntry = await t.eval(`(() => { const all = JSON.parse(localStorage.getItem('lpr_custom_templates')); const e = all[${JSON.stringify(id)}];
    const broken = Object.assign({}, e, { id: 'c_oldbase1', name: 'Old copy with doubled base',
      html: e.html.replace(/<base href="([^"]*)">/, (m, u) => '<base href="' + u + u + '">') });
    all.c_oldbase1 = broken; localStorage.setItem('lpr_custom_templates', JSON.stringify(all)); return broken.html.match(/<base href="[^"]*"/)[0]; })()`);
  s.check('(fixture) old-style copy really has the doubled <base>', (oldEntry.match(/file:\/\//g) || []).length === 2, oldEntry);
  t.logs.length = 0;
  await t.goto(url('view.html', '?id=c_oldbase1'), 2800);
  const baseNow = await t.eval(`document.querySelector('base') && document.querySelector('base').getAttribute('href')`);
  s.check('old copy: <base> repaired on open', baseNow === DIR, baseNow);
  const pdf2 = (await exportAs(t, 'pdf')).find(b => b.type === 'application/pdf');
  s.check('old copy: Export → PDF works', !!pdf2, t.logs.join(' | '));

  // ---- HTML export: standalone file has styles + images ----
  await t.goto(url('Letterhead.html'));
  const html = (await exportAs(t, 'html', 1500)).find(b => b.type.startsWith('text/html'));
  const file = join(ARTIFACTS, 'exported-letterhead.html');
  writeFileSync(file, html.buf);
  await t.goto(pathToFileURL(file).href, 2000);
  const sa = await t.eval(`({ font: getComputedStyle(document.querySelector('.sheet')).fontFamily, logo: [...document.images].filter(i => i.closest('.lh-header')).every(i => i.complete && i.naturalWidth > 0), bg: getComputedStyle(document.body).backgroundColor, scripts: document.scripts.length })`);
  s.check('exported HTML opens on its own with brand fonts + logo', /Montserrat/i.test(sa.font) && sa.logo && sa.scripts === 0, JSON.stringify(sa));

  // ---- A "/" inside a URL parameter must not break asset paths ----
  await t.goto(url('Letterhead.html', '?title=Owner/Manager&name=Test User'));
  const h2 = (await exportAs(t, 'html', 1500)).find(b => b.type.startsWith('text/html'));
  const links = [...h2.buf.toString('utf-8').matchAll(/<link[^>]*href="([^"]*)"/g)].map(m => m[1]);
  s.check('HTML export with ?title=Owner/Manager: stylesheet paths point at the templates folder', links.length && links.every(l => l.startsWith(DIR) && !l.includes('?')), JSON.stringify(links));
  const id3 = await saveAs(t, 'Slash param');
  const saved3 = await savedHtml(t, id3);
  s.check('Save As with ?title=Owner/Manager: <base> is the templates folder', (saved3.match(/<base href="([^"]*)"/) || [])[1] === DIR);
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); s.done(); }
