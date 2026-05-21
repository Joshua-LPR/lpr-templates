/* ============================================================
   LPR Fill Fields  —  fill-fields.js
   ------------------------------------------------------------
   Adds a "Fields" tab to the Setup panel for any template
   that has data-fill-field spans. Supported types:

     date   → calendar date picker → displays "Month D, YYYY"
     time   → clock picker         → displays "H:MM AM/PM"
     amount → dollar text input    → displays as typed ($ shown outside span)
     text   → plain text input     → displays as typed

   Template markup:
     <span data-fill-field="date"   data-fill-label="Notice Date"></span>
     <span data-fill-field="time"   data-fill-label="Appointment Time"></span>
     <span data-fill-field="amount" data-fill-label="Amount Due"></span>
     <span data-fill-field="text"   data-fill-label="Property Name"></span>

   Multiple spans sharing the same label share the same value.
   Use data-fill-key to distinguish same-label fields.

   Values persist in localStorage per page.
   ============================================================ */
(function () {
  'use strict';

  const PAGE_KEY    = (location.pathname.split('/').pop() || 'page').replace(/\.html?$/i, '');
  const STORAGE_KEY = 'lpr_fill_' + PAGE_KEY;

  /* ================================================================
     FIELD DISCOVERY
     ================================================================ */
  function getFieldDefs() {
    const seen = new Map();
    document.querySelectorAll('[data-fill-field]').forEach(function (el) {
      var type  = el.getAttribute('data-fill-field') || 'text';
      var label = el.getAttribute('data-fill-label') || type;
      var key   = el.getAttribute('data-fill-key')   || slugify(label);
      if (!seen.has(key)) seen.set(key, { type: type, label: label, key: key, els: [] });
      seen.get(key).els.push(el);
    });
    return Array.from(seen.values());
  }

  function slugify(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  /* ================================================================
     STORAGE
     ================================================================ */
  function loadValues() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function saveValue(key, raw) {
    var vals = loadValues();
    if (raw) vals[key] = raw; else delete vals[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vals));
  }

  /* ================================================================
     FORMAT + APPLY
     ================================================================ */
  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

  function formatValue(type, raw) {
    if (!raw) return '';
    if (type === 'date') {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
      if (!m) return raw;
      return MONTHS[+m[2] - 1] + ' ' + +m[3] + ', ' + m[1];
    }
    if (type === 'time') {
      var t = /^(\d{1,2}):(\d{2})$/.exec(raw);
      if (!t) return raw;
      var h = +t[1], min = t[2];
      return ((h % 12) || 12) + ':' + min + ' ' + (h >= 12 ? 'PM' : 'AM');
    }
    return raw; // amount, text — display as typed
  }

  function applyField(def, raw) {
    var display = formatValue(def.type, raw);
    def.els.forEach(function (el) { el.textContent = display; });
  }

  function applyAll() {
    var vals = loadValues();
    getFieldDefs().forEach(function (def) { applyField(def, vals[def.key] || ''); });
  }

  /* ================================================================
     PLACEHOLDER LABELLING (drives the ::before CSS)
     ================================================================ */
  function labelFillFields() {
    document.querySelectorAll('[data-fill-field]').forEach(function (el) {
      var label = el.getAttribute('data-fill-label') || el.getAttribute('data-fill-field');
      if (label) el.setAttribute('data-fill-placeholder', label);
    });
  }

  /* ================================================================
     TAB RENDER
     ================================================================ */
  function render(container) {
    var defs = getFieldDefs();
    var vals = loadValues();

    if (defs.length === 0) {
      container.innerHTML = '<div class="lpr-ff-empty">No fill fields on this template.</div>';
      return;
    }

    container.innerHTML =
      '<div class="lpr-ff-body">' +
        '<div class="lpr-ff-fields" id="lpr-ff-fields">' +
          defs.map(function (def) { return renderField(def, vals[def.key] || ''); }).join('') +
        '</div>' +
        '<div class="lpr-ff-foot">' +
          '<button class="lpr-ff-apply" id="lpr-ff-apply-btn">Apply to Template</button>' +
          '<button class="lpr-ff-clear" id="lpr-ff-clear-btn">Clear All</button>' +
        '</div>' +
      '</div>';

    /* wire each input — live-apply on every keystroke/change */
    defs.forEach(function (def) {
      var inp = container.querySelector('[data-ff-key="' + def.key + '"]');
      if (!inp) return;

      function onUpdate() {
        var raw = inp.value;
        saveValue(def.key, raw);
        applyField(def, raw);
      }
      inp.addEventListener('change', onUpdate);
      if (def.type === 'amount' || def.type === 'text') {
        inp.addEventListener('input', onUpdate);
      }
    });

    document.getElementById('lpr-ff-apply-btn').onclick = function () {
      applyAll();
      var btn = document.getElementById('lpr-ff-apply-btn');
      if (!btn) return;
      btn.textContent = '✓ Applied';
      setTimeout(function () { btn.textContent = 'Apply to Template'; }, 1800);
    };

    document.getElementById('lpr-ff-clear-btn').onclick = function () {
      localStorage.removeItem(STORAGE_KEY);
      getFieldDefs().forEach(function (def) { applyField(def, ''); });
      render(container);
    };

    /* ---- Replace native date inputs with flatpickr ---- */
    var hasPickers = defs.some(function (d) { return d.type === 'date' || d.type === 'time'; });
    if (hasPickers) {
      loadFlatpickr().then(function () {
        defs.forEach(function (def) {
          if (def.type !== 'date' && def.type !== 'time') return;
          var inp = container.querySelector('[data-ff-key="' + def.key + '"]');
          if (!inp || inp._flatpickr) return;
          var opts = {
            disableMobile: true,
            defaultDate: vals[def.key] || null,
            onChange: function (selectedDates, dateStr) {
              saveValue(def.key, dateStr);
              applyField(def, dateStr);
            }
          };
          if (def.type === 'date') {
            opts.dateFormat   = 'Y-m-d';
            opts.altInput     = true;
            opts.altFormat    = 'F j, Y';
            opts.altInputClass = 'lpr-ff-inp lpr-ff-has-icon';
          } else {
            opts.enableTime   = true;
            opts.noCalendar   = true;
            opts.dateFormat   = 'H:i';
            opts.time_24hr    = false;
            opts.altInput     = true;
            opts.altFormat    = 'h:i K';
            opts.altInputClass = 'lpr-ff-inp lpr-ff-has-icon';
          }
          flatpickr(inp, opts);
        });
      }).catch(function () {}); // silently fall back to native picker on network error
    }
  }

  /* ================================================================
     FLATPICKR LOADER
     ================================================================ */
  function loadFlatpickr() {
    if (window.flatpickr) return Promise.resolve();
    if (window._lpr_fp_promise) return window._lpr_fp_promise;
    if (!document.getElementById('lpr-fp-css')) {
      var link = document.createElement('link');
      link.id = 'lpr-fp-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css';
      document.head.appendChild(link);
    }
    window._lpr_fp_promise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.js';
      s.onload = function () { injectFlatpickrTheme(); resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window._lpr_fp_promise;
  }

  function injectFlatpickrTheme() {
    if (document.getElementById('lpr-fp-theme')) return;
    var s = document.createElement('style');
    s.id = 'lpr-fp-theme';
    s.textContent = [
      '.flatpickr-calendar{font-family:\'Montserrat\',sans-serif!important;border-radius:10px!important;',
      '  box-shadow:0 8px 32px rgba(0,0,0,.22)!important;border:1px solid rgba(40,56,145,.15)!important;}',
      '.flatpickr-months{background:#283891;border-radius:9px 9px 0 0;}',
      '.flatpickr-month,.flatpickr-prev-month,.flatpickr-next-month{color:#fff!important;fill:#fff!important;}',
      '.flatpickr-prev-month:hover svg,.flatpickr-next-month:hover svg{fill:#fff!important;}',
      '.flatpickr-prev-month:hover,.flatpickr-next-month:hover{background:rgba(255,255,255,.15)!important;}',
      '.flatpickr-current-month{color:#fff;font-size:13px!important;font-weight:700!important;}',
      '.flatpickr-current-month .numInputWrapper input{color:#fff!important;font-weight:700;}',
      '.flatpickr-weekday{color:rgba(40,56,145,.65)!important;font-weight:700;}',
      '.flatpickr-day{border-radius:6px!important;font-size:12px;}',
      '.flatpickr-day:hover:not(.selected){background:#eef0fb!important;border-color:#eef0fb!important;}',
      '.flatpickr-day.selected,.flatpickr-day.selected:hover{background:#283891!important;border-color:#283891!important;color:#fff!important;}',
      '.flatpickr-day.today{border-color:#d6a35a!important;font-weight:700;}',
      '.flatpickr-day.today:not(.selected){color:#b07800!important;}',
      '.flatpickr-day.today.selected{background:#283891!important;border-color:#283891!important;color:#fff!important;}',
      '.flatpickr-day.prevMonthDay,.flatpickr-day.nextMonthDay{color:#ccc!important;}',
      /* alt input (date display) — inherits lpr-ff-inp styling; just add pointer cursor */
      'input.flatpickr-input.lpr-ff-inp,.lpr-ff-inp.lpr-ff-has-icon.flatpickr-input{cursor:pointer;}',
      /* time-only picker popup */
      '.flatpickr-calendar.noCalendar{border-radius:10px!important;min-width:160px;}',
      '.flatpickr-time{border-top:none;padding:12px 10px;display:flex;align-items:center;gap:4px;}',
      '.flatpickr-time .numInputWrapper{flex:1;}',
      '.flatpickr-time input.flatpickr-hour,.flatpickr-time input.flatpickr-minute{',
      '  font-family:\'Montserrat\',sans-serif!important;font-size:20px!important;font-weight:700!important;',
      '  color:#283891!important;background:transparent!important;border:none!important;text-align:center;}',
      '.flatpickr-time .flatpickr-am-pm{font-family:\'Montserrat\',sans-serif!important;font-weight:700;',
      '  color:#283891!important;background:#eef0fb;border-radius:6px;padding:2px 6px;font-size:13px!important;}',
      '.flatpickr-time .flatpickr-am-pm:hover{background:#283891!important;color:#fff!important;}',
      '.flatpickr-time .numInputWrapper span{border-color:rgba(40,56,145,.2);}',
      '.flatpickr-time .numInputWrapper span.arrowUp:after{border-bottom-color:#283891;}',
      '.flatpickr-time .numInputWrapper span.arrowDown:after{border-top-color:#283891;}',
      '.flatpickr-time-separator{color:#283891!important;font-weight:700;font-size:18px;}',
      /* flatpickr wrapper should be block so icon-wrap height tracks the input */
      '.lpr-ff-icon-wrap .flatpickr-wrapper{display:block;width:100%;}',
    ].join('');
    document.head.appendChild(s);
  }

  var CAL_ICON = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#283891" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="14" height="12" rx="2"/><path d="M1 7h14M5 1v4M11 1v4"/></svg>';
  var CLK_ICON = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#283891" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="7"/><path d="M8 4v4l3 2"/></svg>';

  function renderField(def, raw) {
    var k = esc(def.key);
    var input;
    if (def.type === 'date') {
      input = '<div class="lpr-ff-icon-wrap"><input type="date" class="lpr-ff-inp lpr-ff-has-icon" data-ff-key="' + k + '" value="' + esc(raw) + '" /><span class="lpr-ff-icon" aria-hidden="true">' + CAL_ICON + '</span></div>';
    } else if (def.type === 'time') {
      input = '<div class="lpr-ff-icon-wrap"><input type="time" class="lpr-ff-inp lpr-ff-has-icon" data-ff-key="' + k + '" value="' + esc(raw) + '" /><span class="lpr-ff-icon" aria-hidden="true">' + CLK_ICON + '</span></div>';
    } else if (def.type === 'amount') {
      input =
        '<div class="lpr-ff-money">' +
          '<span class="lpr-ff-dollar">$</span>' +
          '<input type="text" class="lpr-ff-inp lpr-ff-amt-inp" data-ff-key="' + k + '" value="' + esc(raw) + '" placeholder="0.00" inputmode="decimal" />' +
        '</div>';
    } else {
      input = '<input type="text" class="lpr-ff-inp" data-ff-key="' + k + '" value="' + esc(raw) + '" placeholder="' + esc(def.label) + '" />';
    }
    return (
      '<div class="lpr-ff-field">' +
        '<label class="lpr-ff-lbl">' + esc(def.label) + '</label>' +
        input +
      '</div>'
    );
  }

  /* ================================================================
     HELPERS
     ================================================================ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ================================================================
     STYLES
     ================================================================ */
  function injectStyles() {
    if (document.getElementById('lpr-ff-css')) return;
    var s = document.createElement('style');
    s.id = 'lpr-ff-css';
    s.textContent = [
      /* ---- tab body wrapper ---- */
      '.lpr-ff-body{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;}',

      /* ---- scrollable field list ---- */
      '.lpr-ff-fields{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;}',
      '.lpr-ff-empty{padding:24px;text-align:center;color:#bbb;font-size:12px;font-style:italic;}',

      /* ---- individual field ---- */
      '.lpr-ff-field{display:flex;flex-direction:column;gap:4px;}',
      '.lpr-ff-lbl{font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#aaa;}',

      /* ---- all input types ---- */
      '.lpr-ff-inp{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid #ddd;border-radius:5px;',
      '  font-family:\'Montserrat\',sans-serif;font-size:12.5px;color:#0e1430;outline:none;background:#fff;}',
      '.lpr-ff-inp:focus{border-color:#283891;}',
      '.lpr-ff-inp[type="date"],.lpr-ff-inp[type="time"]{cursor:pointer;}',

      /* ---- dollar-amount compound field ---- */
      '.lpr-ff-money{display:flex;align-items:stretch;border:1px solid #ddd;border-radius:5px;overflow:hidden;background:#fff;}',
      '.lpr-ff-money:focus-within{border-color:#283891;}',
      '.lpr-ff-dollar{padding:0 8px;font-size:13px;font-weight:600;color:#5a5f72;',
      '  background:#f7f8ff;border-right:1px solid #ddd;flex-shrink:0;display:flex;align-items:center;}',
      '.lpr-ff-amt-inp{border:none!important;border-radius:0;flex:1;min-width:0;}',
      '.lpr-ff-amt-inp:focus{outline:none;}',

      /* ---- footer buttons ---- */
      '.lpr-ff-foot{padding:11px 14px;border-top:1px solid #eee;flex-shrink:0;display:flex;flex-direction:column;gap:6px;}',
      '.lpr-ff-apply{width:100%;padding:10px;background:#283891;color:#fff;border:none;border-radius:999px;',
      '  font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s;}',
      '.lpr-ff-apply:hover{background:#1c2870;}',
      '.lpr-ff-clear{width:100%;padding:7px;background:none;color:#283891;border:1.5px solid #283891;border-radius:999px;',
      '  font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;}',
      '.lpr-ff-clear:hover{background:#ffeaea;border-color:#c33;color:#c33;}',

      /* ---- date/time icon wrapper ---- */
      '.lpr-ff-icon-wrap{position:relative;}',
      '.lpr-ff-has-icon{padding-right:30px!important;}',
      '.lpr-ff-icon{position:absolute;right:9px;top:50%;transform:translateY(-50%);pointer-events:none;display:flex;align-items:center;opacity:.6;}',

      /* ---- placeholder on unfilled spans (screen only) ---- */
      '[data-fill-field]:empty::before{',
      '  content:attr(data-fill-placeholder);color:rgba(40,56,145,.3);',
      '  font-style:italic;font-size:.9em;border-bottom:1px dashed rgba(40,56,145,.22);pointer-events:none;}',
      '@media print{[data-fill-field]:empty::before{display:none;}}',

      /* ---- edit-mode highlight (gold so it's distinct from tenant/contact fields) ---- */
      '.sheet.tt-editing [data-fill-field]{background:rgba(214,163,90,.1);',
      '  outline:1px dashed rgba(214,163,90,.5);border-radius:2px;padding:0 2px;}',
      '.sheet.tt-editing [data-fill-field]:empty::before{content:attr(data-fill-placeholder);',
      '  color:rgba(180,120,0,.7);font-style:italic;font-size:.88em;border-bottom:none;}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ================================================================
     INIT
     ================================================================ */
  function init() {
    if (getFieldDefs().length === 0) return; // no fill fields on this page — silent no-op

    injectStyles();
    labelFillFields();
    applyAll(); // restore any previously saved values

    window.LPR_FILL_TABS = window.LPR_FILL_TABS || [];
    window.LPR_FILL_TABS.push({ id: 'fill-fields', label: 'Fields', render: render });

    window.LPR_FILL_APPLY = applyAll; // lets insert sidebar trigger a re-apply after inserting a span
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
