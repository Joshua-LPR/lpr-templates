/* ============================================================
   LPR Signature Block  —  signature-block.js
   ------------------------------------------------------------
   Per-document signature settings for letter sheets that opt in
   with `data-sig-options`. Adds two rows to Setup → Sender (owners.js,
   via window.LPR_SENDER_EXTRAS), next to its other sign-off toggles
   and applied by the same "Apply to Template" button:

     Your signature        Gallery default · Leave blank · Signature line
     Tenant signature lines None · 1 tenant · 2 tenants

   "Leave blank" omits the signature on purpose (no space, no
   line). "Signature line" prints a Landlord/Agent Signature row to
   be signed later — the SAME row markup/CSS as the tenant rows.
   The tenant block is general-purpose (payment plans, agreements),
   not a receipt — signature rows only, no fixed wording.

   Spec: style-guide.html "Signature Blocks"; PROJECT.md.

   State: per template in localStorage (lpr_sigopt_<file>) and
   mirrored onto the sheet as data-sig-mode / data-sig-tenants, so a
   Save As copy reopens exactly as saved (snapshots are never
   re-rendered on load).

   Multi-page flow: the sign-off may sit on a generated continuation
   page, so every change merges the pages back (LPR_FLOW.unpaginate)
   before editing the block and re-paginates after.

   Load order: after employee.js and owners.js, before
   template-tools.js. Uses window.LPR_SIGNATURE (employee.js).
   ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = { mode: 'gallery', tenants: '0' };
  var FILE = window.LPR_UTIL.fileKey();
  var KEY = 'lpr_sigopt_' + FILE;

  var sheets = [];
  var state = null;

  function esc(s) { return window.LPR_UTIL.esc(s); } // shared helper in user.js

  // One signature row — shared by the sender line and every tenant row.
  // nameHtml (optional) prints under the signature line.
  function rowHtml(label, nameHtml) {
    return '<div class="sig-row">' +
             '<span class="sig-label">' + esc(label) + '</span><span class="sig-line"></span>' +
             '<span class="sig-label sig-date-label">Date</span><span class="sig-line sig-date"></span>' +
             (nameHtml != null ? '<span class="sig-name">' + nameHtml + '</span>' : '') +
           '</div>';
  }

  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    return {
      mode: s.mode || DEFAULTS.mode,
      tenants: String(s.tenants || DEFAULTS.tenants)
    };
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // Saved copies carry their state on the sheet itself.
  function readFromSheet(sheet) {
    return {
      mode: sheet.getAttribute('data-sig-mode') || DEFAULTS.mode,
      tenants: sheet.getAttribute('data-sig-tenants') || DEFAULTS.tenants
    };
  }

  /* ================================================================
     RENDER
     ================================================================ */
  function applySender(sheet) {
    sheet.querySelectorAll('.signoff .signature').forEach(function (el) {
      el.classList.toggle('sig-as-line', state.mode === 'line');
      if (state.mode === 'line') {
        el.innerHTML = rowHtml('Landlord/Agent Signature');
        return;
      }
      // Leave blank → nothing. Gallery default → the gallery's choice (which
      // may itself be the gallery's "Leave blank" — then this stays empty).
      if (state.mode === 'blank' || !el.querySelector('img.lpr-sig-img')) el.innerHTML = '';
      if (state.mode === 'gallery' && window.LPR_SIGNATURE) window.LPR_SIGNATURE.inject(el);
    });
  }

  function applyTenants(sheet) {
    var old = sheet.querySelector('.sig-block[data-sig-tenant-block]');
    if (old) old.remove();
    var n = parseInt(state.tenants, 10) || 0;
    if (!n) return;
    var signoffs = sheet.querySelectorAll('.signoff');
    var anchor = signoffs[signoffs.length - 1];
    if (!anchor) return;

    // Tenant 1's printed name is a live contact token (tenants.js fills every
    // [data-contact-field] on selection); seed it from the recipient now.
    var recip = sheet.querySelector('.recipient [data-contact-field="name"]') ||
                sheet.querySelector('[data-contact-field="name"]');
    var html = '';
    for (var i = 0; i < n; i++) {
      var name = i === 0
        ? '<span data-contact-field="name"' +
            (recip && recip.getAttribute('data-contact-label') ? ' data-contact-label="' + esc(recip.getAttribute('data-contact-label')) + '"' : '') +
            '>' + esc(recip ? recip.textContent : '') + '</span>'
        : '';
      html += '<div class="sig-signer">' + rowHtml('Tenant Signature', name) + '</div>';
    }
    var block = document.createElement('div');
    block.className = 'sig-block';
    block.setAttribute('data-sig-tenant-block', '');
    block.innerHTML = html;
    anchor.after(block);
  }

  function apply() {
    var flow = window.LPR_FLOW;
    if (flow) flow.unpaginate(); // the sign-off may be on a continuation page
    sheets.forEach(function (sheet) {
      sheet.setAttribute('data-sig-mode', state.mode);
      sheet.setAttribute('data-sig-tenants', state.tenants);
      applySender(sheet);
      applyTenants(sheet);
    });
    if (flow) flow.paginate();   // no-op while editing (stays one sheet)
  }

  /* ================================================================
     SETUP → SENDER rows (rendered by owners.js's Sender tab)
     ================================================================ */
  function row(label, key, options, sub) {
    return '<div class="lpr-own-toggle-row' + (sub ? ' lpr-own-sub-toggle' : '') + '">' +
             '<label class="lpr-own-toggle-label lpr-sig-row">' +
               '<span>' + esc(label) + '</span>' +
               '<select class="lpr-sig-select" data-sigopt="' + key + '">' +
                 options.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('') +
               '</select>' +
             '</label>' +
           '</div>';
  }

  // Returns commit(): called by the Sender tab's "Apply to Template".
  function renderControls(el) {
    el.innerHTML =
      // sub-toggle: dims with "Include signer name" (no signer → no signature)
      row('Your signature', 'mode', [['gallery', 'Gallery default'], ['blank', 'Leave blank'], ['line', 'Signature line']], true) +
      row('Tenant signature lines', 'tenants', [['0', 'None'], ['1', '1 tenant'], ['2', '2 tenants']], false);
    el.querySelectorAll('select').forEach(function (s) { s.value = state[s.getAttribute('data-sigopt')]; });
    return function commit() {
      el.querySelectorAll('select').forEach(function (s) { state[s.getAttribute('data-sigopt')] = s.value; });
      save();
      apply();
    };
  }

  function injectStyles() {
    if (document.getElementById('lpr-sig-css')) return;
    var st = document.createElement('style');
    st.id = 'lpr-sig-css';
    st.textContent =
      '.lpr-sig-row{justify-content:space-between;}' +
      '.lpr-sig-row>span{white-space:nowrap;}' +
      '.lpr-sig-select{min-width:0;max-width:58%;font:inherit;font-size:12px;padding:3px 6px;border:1px solid #ddd;border-radius:5px;background:#fff;color:var(--lpr-ink);}';
    document.head.appendChild(st);
  }

  function register() {
    injectStyles();
    window.LPR_SENDER_EXTRAS = window.LPR_SENDER_EXTRAS || [];
    window.LPR_SENDER_EXTRAS.push({ id: 'signatures', render: renderControls });
  }

  /* ================================================================
     INIT
     ================================================================ */
  sheets = [].slice.call(document.querySelectorAll('.sheet[data-sig-options]'));
  if (!sheets.length) return;
  var snapshot = !!document.documentElement.dataset.lprSnapshot;
  state = snapshot ? readFromSheet(sheets[0]) : load();
  register();

  function init() { if (!snapshot) apply(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
