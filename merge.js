/* ============================================================
   merge.js — mail merge: one copy of the template per tenant

   Templates opt in with data-merge on their .stage (Letterhead, Letter
   Watermark, Notice Template, 24-Hour Notice, Envelope, Envelope
   Premium). Tenants tab → "Merge…" → pick tenants (search, filter by
   building or landlord) → Preview: the visible sheet(s) are copied once
   per tenant and each copy is filled from that tenant's record with the
   SAME code a single pick uses (LPR_TENANTS.applyTenantAsRecipient,
   scoped to the copy). Shared by every copy: the letter's wording,
   Fields-tab fill-ins, Sender + signature lines. Letterhead copies each
   paginate on their own (LPR_FLOW.rescan). Print / Export → PDF then
   produce the whole stack as one job / one file. While merging, Edit
   and Save As are hidden (a merged stack must not be saved as one
   document); Exit restores the single document exactly.

   Individualized notices (Security Deposit, Rent Increase…) are a later
   phase — they need per-tenant amounts.

   Loaded by template-tools.js (ensureLib); used by tenants.js.
   ============================================================ */
(function () {
  if (window.LPR_MERGE) return;
  var U = window.LPR_UTIL;
  var MAX = 100;
  var state = null;   // { originals, flowAttr, copies } while merging

  function esc(s) { return U.esc(s); }
  function T() { return window.LPR_TENANTS; }
  function named(t) { return t.effective && (t.effective.first_name || t.effective.last_name); }
  function fullName(t) { return [t.effective.last_name, t.effective.first_name].filter(Boolean).join(', '); }

  /* ---- picker ---------------------------------------------------- */
  function open() {
    if (!T() || state) return;
    var all = Object.values(T().loadTenants()).filter(named)
      .sort(function (a, b) { return fullName(a).localeCompare(fullName(b)); });
    var uniq = function (f) { return all.map(f).filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(); };
    var buildings = uniq(function (t) { return t.effective.address_line1; });
    var landlords = uniq(function (t) { return t.effective.landlord; });
    var chosen = {};
    // Current = in the latest tenant CSV import (tenants.js). The note keeps
    // the reminder in front of whoever runs a merge.
    var info = T().importInfo ? T().importInfo() : null;
    var days = info ? Math.floor((Date.now() - info.id) / 86400000) : null;
    var stale = !info || days > 14;
    var noteHtml = info
      ? 'Current = the ' + info.count + ' tenants in the tenant list imported ' + new Date(info.id).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
        (days > 0 ? ' (' + days + ' day' + (days === 1 ? '' : 's') + ' ago)' : ' (today)') + '. Import the latest Buildium tenant export first (Setup &rarr; Tenants &rarr; Import CSV) so move-outs drop off.'
      : 'Import the latest Buildium tenant export (Setup &rarr; Tenants &rarr; Import CSV) before merging, so past tenants can be left out.';

    var back = document.createElement('div');
    back.className = 'tt-backdrop lpr-merge-backdrop';
    back.innerHTML =
      '<div class="tt-dialog lpr-merge-dlg">' +
        '<h2>Mail merge</h2>' +
        '<p>One copy of this template for each tenant you tick, filled with their name and address. The wording, Fields-tab values, sender and signature lines are the same on every copy.</p>' +
        '<div class="lpr-merge-note' + (stale ? ' stale' : '') + '">' + noteHtml + '</div>' +
        '<div class="lpr-merge-filters">' +
          '<select class="lpr-merge-scope"><option value="current">Current tenants</option><option value="all">All tenants (incl. past)</option></select>' +
          '<input type="text" class="lpr-merge-q" placeholder="Search name or address…">' +
          '<select class="lpr-merge-bldg"><option value="">All buildings</option>' + buildings.map(function (b) { return '<option>' + esc(b) + '</option>'; }).join('') + '</select>' +
          (landlords.length ? '<select class="lpr-merge-owner"><option value="">All landlords</option>' + landlords.map(function (l) { return '<option>' + esc(l) + '</option>'; }).join('') + '</select>' : '') +
        '</div>' +
        '<div class="lpr-merge-tools"><button type="button" data-act="all">Tick all shown</button><button type="button" data-act="none">Untick all</button><span class="lpr-merge-count"></span></div>' +
        '<div class="lpr-merge-list"></div>' +
        '<div class="actions"><button data-act="cancel" class="muted">Cancel</button><button data-act="go" class="primary">Preview</button></div>' +
      '</div>';
    document.body.appendChild(back);
    var q = back.querySelector('.lpr-merge-q'), bl = back.querySelector('.lpr-merge-bldg'), ow = back.querySelector('.lpr-merge-owner'), sc = back.querySelector('.lpr-merge-scope');
    var list = back.querySelector('.lpr-merge-list'), count = back.querySelector('.lpr-merge-count'), go = back.querySelector('[data-act="go"]');

    function shown() {
      var s = q.value.trim().toLowerCase();
      return all.filter(function (t) {
        var e = t.effective;
        if (sc.value === 'current' && T().isCurrent && !T().isCurrent(t)) return false;
        if (bl.value && e.address_line1 !== bl.value) return false;
        if (ow && ow.value && e.landlord !== ow.value) return false;
        return !s || [e.first_name, e.last_name, e.address_line1, e.address_line2, e.city].join(' ').toLowerCase().indexOf(s) >= 0;
      });
    }
    function paint() {
      var rows = shown();
      list.innerHTML = rows.length ? rows.map(function (t) {
        var e = t.effective;
        return '<label class="lpr-merge-row"><input type="checkbox" data-id="' + esc(t._id) + '"' + (chosen[t._id] ? ' checked' : '') + '>' +
               '<span class="lpr-merge-name">' + esc(fullName(t)) + '</span>' +
               '<span class="lpr-merge-addr">' + esc([e.address_line1, e.address_line2].filter(Boolean).join(', ')) + '</span></label>';
      }).join('') : '<div class="lpr-merge-empty">' + (all.length ? 'No tenants match.' : 'No tenants yet. Import a tenant CSV first.') + '</div>';
      counts();
    }
    // A tick only updates the count — redrawing the list would jump a long list.
    function counts() {
      var n = Object.keys(chosen).length;
      count.textContent = n + ' selected' + (n > MAX ? ' (max ' + MAX + ' at a time)' : '');
      go.textContent = 'Preview ' + n + (n === 1 ? ' copy' : ' copies');
      go.disabled = !n || n > MAX;
    }
    function close() { back.remove(); }
    q.addEventListener('input', paint); bl.addEventListener('change', paint); sc.addEventListener('change', paint); if (ow) ow.addEventListener('change', paint);
    list.addEventListener('change', function (e) {
      var id = e.target.getAttribute('data-id');
      if (!id) return;
      if (e.target.checked) chosen[id] = true; else delete chosen[id];
      counts();
    });
    back.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (e.target === back || act === 'cancel') return close();
      if (act === 'all') { shown().forEach(function (t) { chosen[t._id] = true; }); paint(); }
      if (act === 'none') { chosen = {}; paint(); }
      if (act === 'go') {
        // keep the list order (by last name)
        var pick = all.filter(function (t) { return chosen[t._id]; });
        close();
        start(pick);
      }
    });
    paint();
    q.focus();
  }

  /* ---- preview ---------------------------------------------------- */
  function start(tenants) {
    if (!tenants.length || state) return;
    var flow = window.LPR_FLOW;
    if (flow) flow.unpaginate();
    var stage = document.querySelector('[data-merge]');
    var originals = [].slice.call(stage.querySelectorAll('.sheet')).filter(function (s) {
      return s.offsetHeight > 0 && !s.classList.contains('flow-page');
    });
    if (!originals.length) { if (flow) flow.paginate(); return; }
    state = { originals: originals, flowAttr: originals.map(function (s) { return s.hasAttribute('data-flow'); }), copies: [] };
    var anchor = originals[originals.length - 1];
    tenants.forEach(function (t) {
      originals.forEach(function (o) {
        var c = o.cloneNode(true);
        c.classList.add('lpr-merge-copy');
        c.setAttribute('data-merge-tenant', t._id);
        c.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
        anchor.after(c);
        anchor = c;
        T().applyTenantAsRecipient(t, c);
        state.copies.push(c);
      });
    });
    originals.forEach(function (o) { o.classList.add('lpr-merge-hidden'); o.removeAttribute('data-flow'); });
    document.body.classList.add('lpr-merging');
    showBar(tenants.length);
    if (flow) flow.rescan();
  }

  function exit() {
    if (!state) return;
    var flow = window.LPR_FLOW;
    if (flow) flow.unpaginate();
    state.copies.forEach(function (c) { c.remove(); });
    state.originals.forEach(function (o, i) {
      o.classList.remove('lpr-merge-hidden');
      if (state.flowAttr[i]) o.setAttribute('data-flow', '');
    });
    state = null;
    document.body.classList.remove('lpr-merging');
    var bar = document.getElementById('lpr-merge-bar');
    if (bar) bar.remove();
    if (flow) flow.rescan();
  }

  function exportVia(kind) {
    var btn = document.getElementById('tt-export-btn');
    if (!btn) { if (kind === 'print') window.print(); return; }
    btn.click();
    var item = document.querySelector('.tt-menu-item[data-export="' + kind + '"]');
    if (item) item.click();
  }

  function showBar(n) {
    var bar = document.createElement('div');
    bar.id = 'lpr-merge-bar';
    bar.className = 'lpr-merge-bar no-print';
    bar.innerHTML = '<span><strong>Mail merge</strong> · ' + n + ' ' + (n === 1 ? 'copy' : 'copies') +
      ' (one per tenant). To change the wording, sender or signature lines, exit first.</span>' +
      '<button type="button" data-act="print">Print</button><button type="button" data-act="pdf">Save PDF</button>' +
      '<button type="button" data-act="exit" class="muted">Exit merge</button>';
    bar.addEventListener('click', function (e) {
      var act = e.target.getAttribute('data-act');
      if (act === 'print') exportVia('print');
      if (act === 'pdf') exportVia('pdf');
      if (act === 'exit') exit();
    });
    var stage = document.querySelector('[data-merge]');
    stage.insertBefore(bar, stage.firstChild);
  }

  if (!document.getElementById('lpr-merge-css')) {
    var st = document.createElement('style');
    st.id = 'lpr-merge-css';
    st.textContent =
      '.lpr-merge-hidden { display: none !important; }' +
      // While merging: no Edit / Save As, and no Setup — picking a tenant or
      // applying a Sender there would change every copy at once.
      'body.lpr-merging #tt-edit-btn, body.lpr-merging .tt-btn[data-merge-hide], body.lpr-merging #lpr-fill-btn,' +
      ' body.lpr-merging #lpr-fill-panel, body.lpr-merging #lpr-insert-panel { display: none !important; }' +
      '.lpr-merge-dlg { width: min(560px, 92vw); max-height: 86vh; display: flex; flex-direction: column; }' +
      '.lpr-merge-note { font-size: 11.5px; line-height: 1.45; color: var(--lpr-muted); background: #f5f6fb; border-radius: 6px; padding: 7px 10px; margin-bottom: 8px; }' +
      '.lpr-merge-note.stale { color: #8a4b00; background: #fff4e0; }' +
      '.lpr-merge-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }' +
      '.lpr-merge-filters input, .lpr-merge-filters select { flex: 1 1 150px; min-width: 0; padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; font: inherit; font-size: 12px; }' +
      '.lpr-merge-tools { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; font-size: 12px; }' +
      '.lpr-merge-tools button { padding: 3px 10px !important; font-size: 11px !important; }' +
      '.lpr-merge-count { margin-left: auto; color: var(--lpr-muted); }' +
      '.lpr-merge-list { flex: 1; min-height: 120px; max-height: 46vh; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; margin-bottom: 14px; }' +
      '.lpr-merge-row { display: grid; grid-template-columns: auto 1fr; column-gap: 8px; padding: 6px 10px; border-bottom: 1px solid #f2f2f2; cursor: pointer; font-size: 12px; }' +
      '.lpr-merge-row input { grid-row: span 2; align-self: center; }' +
      '.lpr-merge-name { font-weight: 600; color: var(--lpr-ink); }' +
      '.lpr-merge-addr { color: var(--lpr-muted); font-size: 11px; }' +
      '.lpr-merge-empty { padding: 20px; text-align: center; color: #aaa; font-size: 12px; }' +
      '.lpr-merge-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 0 auto 12px; max-width: 8.5in; padding: 8px 12px;' +
      '  background: #eef0fb; border: 1px solid rgba(40,56,145,.25); border-radius: 8px; font: 12px/1.4 Montserrat, sans-serif; color: var(--lpr-ink); }' +
      '.lpr-merge-bar span { flex: 1 1 260px; }' +
      '.lpr-merge-bar button { padding: 5px 12px; border-radius: 999px; border: 1.5px solid var(--lpr-blue); background: var(--lpr-blue); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }' +
      '.lpr-merge-bar button.muted { background: #fff; color: var(--lpr-blue); }' +
      '@media print { .lpr-merge-bar { display: none !important; } }';
    document.head.appendChild(st);
  }

  window.LPR_MERGE = {
    open: open, start: start, exit: exit,
    get active() { return !!state; }
  };
})();
