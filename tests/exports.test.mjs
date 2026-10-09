// Export (PDF / PNG / HTML) and Save As → Library for a multi-page Letterhead.
import { open } from './lib/cdp.mjs';
import { url, suite, exportAs, saveAs, savedHtml, pdfPageCount, JS } from './lib/site.mjs';

const s = suite('Exports + Save As — multi-page Letterhead');
const t = await open(url('Letterhead.html'));
try {
  await t.eval(`(() => { const b = document.querySelector('.sheet[data-flow] .lh-body'); b.querySelector('.signoff').insertAdjacentHTML('beforebegin', '<p>' + 'We have agreed to split the outstanding balance into equal monthly payments. '.repeat(60) + '</p>');
    document.querySelector('.recipient [data-contact-field="name"]').textContent = 'Jane Doe'; LPR_FLOW.paginate(); })()`);
  const pages = await t.eval(JS.sheets);
  s.check('test letter spans 3+ pages', pages >= 3, pages);

  const pdf = (await exportAs(t, 'pdf')).find(b => b.type === 'application/pdf');
  s.check('Export → PDF: one PDF page per sheet', pdf && pdfPageCount(pdf.buf) === pages, pdf ? pdfPageCount(pdf.buf) : 'no pdf');
  const pngs = (await exportAs(t, 'png')).filter(b => b.type === 'image/png');
  s.check('Export → PNG: one image per sheet', pngs.length === pages, pngs.length);
  const html = (await exportAs(t, 'html', 1500)).find(b => b.type.startsWith('text/html'));
  const h = html ? html.buf.toString('utf-8') : '';
  s.check('Export → HTML: static file keeps every page + page numbers', (h.match(/class="sheet /g) || []).length === pages && (h.match(/class="flow-pageno"/g) || []).length === pages);
  s.check('Export → HTML: no scripts', !/<script/i.test(h));
  s.check('pages intact after exports', (await t.eval(JS.sheets)) === pages);

  const id = await saveAs(t, 'Export test');
  const saved = await savedHtml(t, id);
  s.check('Save As stores ONE unsplit source sheet', (saved.match(/class="sheet /g) || []).length === 1 && !/data-flow-page|flow-pageno|data-flow-(head|tail)/.test(saved));
  s.check('Save As keeps page-flow.js so the copy can re-flow', /page-flow\.js/.test(saved));
  s.check('live page re-paginated after Save As', (await t.eval(JS.sheets)) === pages);

  await t.goto(url('view.html', '?id=' + id), 3000);
  const nums = await t.eval(`[...document.querySelectorAll('.sheet')].map(x => (x.querySelector(':scope > .flow-pageno') || {}).textContent)`);
  s.check('Library copy re-paginates on open', nums.length === pages && nums[0] === 'Page 1 of ' + pages, JSON.stringify(nums));
  s.check('no console errors', t.logs.length === 0, t.logs.join(' || '));
} catch (e) { s.crash(e); }
finally { await t.close(); s.done(); }
