/* ============================================================
   LPR Fill Fields  —  fill-fields.js
   ------------------------------------------------------------
   Adds a "Fields" tab to the Setup panel for any template
   that has data-fill-field spans. Supported types:

     date   → type it (10/8/2026, Oct 8 2026, …) or pick it → shown per
              field: October 8, 2026 · 10/8/2026 · Thursday, October 8,
              2026 · Oct 8, 2026 · the 8th day of October, 2026
     time   → clock picker         → displays "H:MM AM/PM"
     amount → dollar text input    → "1,234.50" (2 decimals); "$" added
              only when the letter has none right before the field
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

  const PAGE_KEY    = window.LPR_UTIL.pageKey(); // shared helper in user.js
  const STORAGE_KEY = 'lpr_fill_' + PAGE_KEY;

  /* Tracks flatpickr instances created by the current render() so they can
     be destroyed before the next render rebuilds the panel — otherwise
     discarded instances leak calendar nodes appended to document.body. */
  var flatpickrInstances = [];

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
      var def = seen.get(key);
      def.els.push(el);
      if (!def.calc && el.getAttribute('data-fill-calc')) def.calc = el.getAttribute('data-fill-calc');
    });
    return Array.from(seen.values());
  }

  /* ================================================================
     CALCULATED AMOUNTS — data-fill-calc="deposit_held + accrued_interest
     - total_deductions": the field is worked out from other fields' keys
     (+ / − only, no eval) and filled wherever it appears; it is read-only
     in the Fields tab. Blank until every input has a number.
     ================================================================ */
  function calcValue(expr, vals) {
    var total = 0, ok = true;
    String(expr).replace(/\s+/g, '').replace(/([+\-]?)([a-z0-9_]+)/g, function (m, sign, key) {
      var n = window.LPR_UTIL.parseMoney(vals[key]);
      if (n == null) ok = false; else total += sign === '-' ? -n : n;
      return '';
    });
    return ok ? total.toFixed(2) : '';
  }
  function applyCalcs(vals) {
    getFieldDefs().forEach(function (def) { if (def.calc) applyField(def, calcValue(def.calc, vals || loadValues())); });
  }
  // "deposit_held + accrued_interest - total_deductions" → the fields' labels
  function formulaText(expr) {
    var labels = {};
    getFieldDefs().forEach(function (d) { labels[d.key] = d.label; });
    return String(expr).replace(/[a-z0-9_]+/g, function (k) { return labels[k] || k; }).replace(/-/g, '−').replace(/\s+/g, ' ');
  }
  // Fields tab: show each calculated amount; a negative result means the
  // other notice fits (the template says which: data-fill-calc-negative).
  function refreshCalcBoxes(container) {
    if (!container) return;
    var vals = loadValues();
    getFieldDefs().forEach(function (def) {
      if (!def.calc) return;
      var box = container.querySelector('[data-ff-calc="' + def.key + '"]');
      var note = container.querySelector('[data-ff-note="' + def.key + '"]');
      var v = calcValue(def.calc, vals);
      if (box) box.value = v === '' ? '' : formatMoney(v);
      if (note) {
        var msg = def.els.map(function (el) { return el.getAttribute('data-fill-calc-negative'); }).filter(Boolean)[0];
        note.textContent = v !== '' && Number(v) < 0 ? (msg || 'This works out below zero.') : '';
      }
    });
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

  var WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  /* ---- dates: typed in any common form, stored as YYYY-MM-DD ----
     10/8/2026 · 10-08-26 · 10.8.2026 · 2026-10-08 · October 8 2026 ·
     Oct 8, 2026 · Sept. 8th 2026 · 8 Oct 2026 · Thursday, October 8, 2026.
     Two-digit year → 20xx. null for anything else (or e.g. 2/30). */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  // Format dropdown examples use the field's own date (today until one is set),
  // like Excel / Google Sheets; the pattern name is the option's tooltip.
  function exampleIso(raw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw || '')) return raw;
    var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function refreshFormatExamples(sel, raw) {
    if (!sel) return;
    [].forEach.call(sel.options, function (o) { if (DATE_FORMATS[o.value]) o.textContent = formatDate(exampleIso(raw), o.value); });
  }
  function monthOf(w) {
    if (!w || w.length < 3) return 0;
    for (var i = 0; i < 12; i++) if (MONTHS[i].toLowerCase().indexOf(w) === 0) return i + 1;
    return 0;
  }
  function parseDate(s) {
    s = String(s || '').trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1')
      .replace(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?,?\s+/, '')         // a leading weekday is ignored
      .replace(/^the\s+(\d{1,2})\s+day\s+of\s+/, '$1 ');                  // "the 8th day of October, 2026"
    var y, m, d, x, w;
    if ((x = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) { y = +x[1]; m = +x[2]; d = +x[3]; }
    else if ((x = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/.exec(s))) { m = +x[1]; d = +x[2]; y = +x[3]; }
    else if ((w = s.replace(/[,.]/g, ' ').split(/\s+/).filter(Boolean)).length === 3 && /^(\d{2}|\d{4})$/.test(w[2])) {
      if (monthOf(w[0]) && /^\d{1,2}$/.test(w[1])) { m = monthOf(w[0]); d = +w[1]; }
      else if (monthOf(w[1]) && /^\d{1,2}$/.test(w[0])) { m = monthOf(w[1]); d = +w[0]; }
      y = +w[2];
    }
    if (!m || !d || !y) return null;
    if (y < 100) y += 2000;
    var dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return y + '-' + pad2(m) + '-' + pad2(d);
  }
  function ordinal(n) { var t = n % 100, u = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }
  // The date formats (per field — Fields tab dropdown, or the key: {{numeric date: …}}).
  var DATE_FORMATS = {
    spelled: { label: 'Spelled out (Month D, YYYY)',              fn: function (y, m, d) { return MONTHS[m - 1] + ' ' + d + ', ' + y; } },
    numeric: { label: 'Numbers (M/D/YYYY)',               fn: function (y, m, d) { return m + '/' + d + '/' + y; } },
    weekday: { label: 'With weekday (Weekday, Month D, YYYY)',  fn: function (y, m, d) { return WEEKDAYS[new Date(y, m - 1, d).getDay()] + ', ' + MONTHS[m - 1] + ' ' + d + ', ' + y; } },
    short:   { label: 'Short month (Mon D, YYYY)',              fn: function (y, m, d) { return MONTHS[m - 1].slice(0, 3) + ' ' + d + ', ' + y; } },
    legal:   { label: 'Legal (the Dth day of Month, YYYY)',  fn: function (y, m, d) { return 'the ' + ordinal(d) + ' day of ' + MONTHS[m - 1] + ', ' + y; } }
  };
  function formatDate(raw, fmt) {
    var x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!x) return raw;
    return (DATE_FORMATS[fmt] || DATE_FORMATS.spelled).fn(+x[1], +x[2], +x[3]);
  }

  // Money: shared with the tenant's rent (user.js LPR_UTIL).
  var formatMoney = window.LPR_UTIL.formatMoney;

  /* ---- date formats: per PLACE, with a per-field override ----
     Each place a date appears may have its own format (data-fill-format,
     set by a key like {{weekday date: Due Date}}), so one date can show as
     "Thursday, October 8, 2026" in the body and "10/8/2026" in a table.
     The Fields-tab dropdown sets ALL places of the field at once (stored per
     page, mirrored on the spans as data-fill-fmt-field so Save As copies
     keep it); its "Different in each place" choice clears that override.
     What a place actually shows is written to data-fill-shown (brand.css
     sizes blank-form lines by it). */
  var FMT_KEY = 'lpr_fillfmt_' + PAGE_KEY;
  function loadFormats() {
    try { return JSON.parse(localStorage.getItem(FMT_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  // The field-wide override, or '' when each place keeps its own.
  function fieldFormat(def) {
    if (def.type !== 'date') return '';
    var chosen = loadFormats()[def.key];
    if (DATE_FORMATS[chosen]) return chosen;
    var mirrored = def.els.map(function (el) { return el.getAttribute('data-fill-fmt-field'); }).filter(function (f) { return DATE_FORMATS[f]; })[0];
    return mirrored || '';
  }
  function placeFormat(def, el) {
    var own = el.getAttribute('data-fill-format');
    return fieldFormat(def) || (DATE_FORMATS[own] ? own : 'spelled');
  }
  // For the dropdown: the one format every place shows, or '' if they differ.
  function formatOf(def) {
    if (def.type !== 'date') return '';
    var shown = def.els.map(function (el) { return placeFormat(def, el); });
    return shown.every(function (f) { return f === shown[0]; }) ? shown[0] : '';
  }
  function setFormat(def, fmt) {
    var f = loadFormats();
    if (fmt) f[def.key] = fmt; else delete f[def.key];
    localStorage.setItem(FMT_KEY, JSON.stringify(f));
    def.els.forEach(function (el) { if (fmt) el.setAttribute('data-fill-fmt-field', fmt); else el.removeAttribute('data-fill-fmt-field'); });
  }

  function formatValue(type, raw, fmt) {
    if (!raw) return '';
    if (type === 'date') return formatDate(raw, fmt);
    if (type === 'amount') return formatMoney(raw);
    if (type === 'time') {
      var t = /^(\d{1,2}):(\d{2})$/.exec(raw);
      if (!t) return raw;
      var h = +t[1], min = t[2];
      return ((h % 12) || 12) + ':' + min + ' ' + (h >= 12 ? 'PM' : 'AM');
    }
    return raw; // text — display as typed
  }

  function applyField(def, raw) {
    def.els.forEach(function (el) {
      if (def.type === 'date') {
        var fmt = placeFormat(def, el);
        if (fmt !== 'spelled') el.setAttribute('data-fill-shown', fmt); else el.removeAttribute('data-fill-shown');   // spelled = the default, no marker
        el.textContent = formatValue('date', raw, fmt);
        return;
      }
      // "$" only where the letter doesn't already have one right before the field
      el.textContent = def.type === 'amount' ? window.LPR_UTIL.moneyText(el, raw) : formatValue(def.type, raw);
    });
  }

  function applyAll() {
    var vals = loadValues();
    getFieldDefs().forEach(function (def) { if (!def.calc) applyField(def, vals[def.key] || ''); });
    applyCalcs(vals);
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
    // Destroy any flatpickr instances left over from a previous render
    // before the panel gets rebuilt below.
    flatpickrInstances.forEach(function (fp) {
      if (fp && typeof fp.destroy === 'function') fp.destroy();
    });
    flatpickrInstances = [];

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
        applyCalcs();
        refreshCalcBoxes(container);
      }
      inp.addEventListener('change', onUpdate);
      if (def.type === 'amount' || def.type === 'text') {
        inp.addEventListener('input', onUpdate);
      }
      // Money: tidy the box when you leave it ("1234.5" → "1,234.50"; the
      // box already shows a "$", so none is kept inside it).
      if (def.type === 'amount') {
        inp.addEventListener('change', function () { inp.value = formatMoney(inp.value); onUpdate(); });
      }
      // Date: how it appears in the letter (per field).
      var sel = container.querySelector('[data-ff-fmt="' + def.key + '"]');
      if (sel) sel.addEventListener('change', function () {
        setFormat(def, sel.value);
        applyField(def, loadValues()[def.key] || '');
        render(container);
      });
    });

    refreshCalcBoxes(container);

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
            // Type a date in any common form, or pick it. The box shows it
            // the way the letter will. Unreadable text → red outline and
            // nothing changes (flatpickr would otherwise clear the date).
            var fmt = formatOf(def) || 'spelled';   // places differ → the box shows it spelled out
            opts.dateFormat   = 'Y-m-d';
            opts.altInput     = true;
            opts.altFormat    = 'letter';
            opts.altInputClass = 'lpr-ff-inp lpr-ff-has-icon';
            opts.allowInput   = true;
            opts.formatDate = function (date, format) {
              var iso = date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
              return format === 'letter' ? formatDate(iso, fmt) : iso;
            };
            opts.parseDate = function (str) {
              var iso = parseDate(str);
              if (!iso) return undefined;
              var p = iso.split('-');
              return new Date(+p[0], +p[1] - 1, +p[2]);
            };
            opts.onReady = function (sd, ds, fp) { datePickerExtras(fp, fmt); };
            opts.onChange = function (selectedDates, dateStr, fp) {
              if (fp.altInput) { fp.altInput.classList.remove('lpr-ff-bad'); fp.altInput.title = ''; }
              if (fp._lprHint) fp._lprHint.textContent = '';
              refreshFormatExamples(container.querySelector('[data-ff-fmt="' + def.key + '"]'), dateStr);
              saveValue(def.key, dateStr);
              applyField(def, dateStr);
            };
          } else {
            opts.enableTime   = true;
            opts.noCalendar   = true;
            opts.dateFormat   = 'H:i';
            opts.time_24hr    = false;
            opts.altInput     = true;
            opts.altFormat    = 'h:i K';
            opts.altInputClass = 'lpr-ff-inp lpr-ff-has-icon';
          }
          var fp = flatpickr(inp, opts);
          if (def.type === 'date') {
            // flatpickr clears the date on text it can't read; refuse it
            // instead — red outline, the saved date and the letter stay.
            var setDate = fp.setDate;
            fp.setDate = function (date) {
              if (typeof date === 'string' && date.trim() && !parseDate(date)) {
                if (fp.altInput) {
                  fp.altInput.classList.add('lpr-ff-bad');
                  fp.altInput.title = 'Not a date I can read. Try 10/8/2026 or October 8, 2026';
                }
                return;
              }
              return setDate.apply(fp, arguments);
            };
          }
          flatpickrInstances.push(fp);
        });
      }).catch(function () {}); // silently fall back to native picker on network error
    }
  }

  /* Date box extras: a Today button in the calendar, and while you type a
     date (any spelling) the calendar jumps to it and a line under the box
     shows (above Today) how it will read. Enter, Tab or clicking away puts it in. */
  function datePickerExtras(fp, fmt) {
    var foot = document.createElement('div');
    foot.className = 'lpr-fp-foot';
    foot.innerHTML = '<div class="lpr-ff-hint"></div><button type="button" class="lpr-fp-today">Today</button>';
    foot.lastChild.addEventListener('click', function () { fp.setDate(new Date(), true); fp.close(); });
    fp.calendarContainer.appendChild(foot);
    var box = fp.altInput;
    if (!box) return;
    box.placeholder = 'Type or pick a date';
    var hint = foot.firstChild;   // in the calendar, so the open calendar never covers it
    fp._lprHint = hint;
    box.addEventListener('input', function () {
      var v = box.value.trim(), iso = v && parseDate(v);
      box.classList.remove('lpr-ff-bad');
      if (iso) {
        var p = iso.split('-');
        fp.jumpToDate(new Date(+p[0], +p[1] - 1, +p[2]));
        hint.textContent = 'Will show as: ' + formatDate(iso, fmt) + '  (Enter to set)';
      } else hint.textContent = v ? 'Keep typing, e.g. 5/1/2000 or May 1, 2000' : '';
    });
    box.addEventListener('blur', function () { setTimeout(function () { hint.textContent = ''; }, 150); });
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
      link.href = 'assets/vendor/flatpickr.min.css';
      document.head.appendChild(link);
    }
    window._lpr_fp_promise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'assets/vendor/flatpickr.min.js';
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
      '.flatpickr-months{background:var(--lpr-blue);border-radius:9px 9px 0 0;}',
      '.flatpickr-month,.flatpickr-prev-month,.flatpickr-next-month{color:#fff!important;fill:#fff!important;}',
      '.flatpickr-prev-month:hover svg,.flatpickr-next-month:hover svg{fill:#fff!important;}',
      '.flatpickr-prev-month:hover,.flatpickr-next-month:hover{background:rgba(255,255,255,.15)!important;}',
      '.flatpickr-current-month{color:#fff;font-size:13px!important;font-weight:700!important;}',
      '.flatpickr-current-month .numInputWrapper input{color:#fff!important;font-weight:700;}',
      /* month dropdown: white on blue in the header, readable dark-on-white list */
      '.flatpickr-current-month .flatpickr-monthDropdown-months{color:#fff!important;font-weight:700;background:transparent!important;border-radius:4px;}',
      '.flatpickr-current-month .flatpickr-monthDropdown-months:hover{background:rgba(255,255,255,.15)!important;}',
      '.flatpickr-current-month .flatpickr-monthDropdown-months option{background:#fff!important;color:#1b1f3b!important;font-weight:500;}',
      '.lpr-fp-foot{border-top:1px solid #eee;padding:6px;text-align:center;}',
      '.lpr-fp-today{font-family:inherit;font-size:12px;font-weight:700;color:var(--lpr-blue);background:#fff;border:1.5px solid var(--lpr-blue);border-radius:999px;padding:3px 16px;cursor:pointer;}',
      '.lpr-fp-today:hover{background:var(--lpr-blue);color:#fff;}',
      '.lpr-ff-hint{font-size:11.5px;font-weight:600;color:var(--lpr-blue);margin-bottom:5px;}',
      '.lpr-ff-hint:empty{display:none;}',
      '.flatpickr-weekday{color:rgba(40,56,145,.65)!important;font-weight:700;}',
      '.flatpickr-day{border-radius:6px!important;font-size:12px;}',
      '.flatpickr-day:hover:not(.selected){background:#eef0fb!important;border-color:#eef0fb!important;}',
      '.flatpickr-day.selected,.flatpickr-day.selected:hover{background:var(--lpr-blue)!important;border-color:var(--lpr-blue)!important;color:#fff!important;}',
      '.flatpickr-day.today{border-color:var(--lpr-gold)!important;font-weight:700;}',
      '.flatpickr-day.today:not(.selected){color:#b07800!important;}',
      '.flatpickr-day.today.selected{background:var(--lpr-blue)!important;border-color:var(--lpr-blue)!important;color:#fff!important;}',
      '.flatpickr-day.prevMonthDay,.flatpickr-day.nextMonthDay{color:#ccc!important;}',
      /* alt input (date display) — inherits lpr-ff-inp styling; just add pointer cursor */
      'input.flatpickr-input.lpr-ff-inp,.lpr-ff-inp.lpr-ff-has-icon.flatpickr-input{cursor:pointer;}',
      /* time-only picker popup */
      '.flatpickr-calendar.noCalendar{border-radius:10px!important;min-width:160px;}',
      '.flatpickr-time{border-top:none;padding:12px 10px;display:flex;align-items:center;gap:4px;}',
      '.flatpickr-time .numInputWrapper{flex:1;}',
      '.flatpickr-time input.flatpickr-hour,.flatpickr-time input.flatpickr-minute{',
      '  font-family:\'Montserrat\',sans-serif!important;font-size:20px!important;font-weight:700!important;',
      '  color:var(--lpr-blue)!important;background:transparent!important;border:none!important;text-align:center;}',
      '.flatpickr-time .flatpickr-am-pm{font-family:\'Montserrat\',sans-serif!important;font-weight:700;',
      '  color:var(--lpr-blue)!important;background:#eef0fb;border-radius:6px;padding:2px 6px;font-size:13px!important;}',
      '.flatpickr-time .flatpickr-am-pm:hover{background:var(--lpr-blue)!important;color:#fff!important;}',
      '.flatpickr-time .numInputWrapper span{border-color:rgba(40,56,145,.2);}',
      '.flatpickr-time .numInputWrapper span.arrowUp:after{border-bottom-color:var(--lpr-blue);}',
      '.flatpickr-time .numInputWrapper span.arrowDown:after{border-top-color:var(--lpr-blue);}',
      '.flatpickr-time-separator{color:var(--lpr-blue)!important;font-weight:700;font-size:18px;}',
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
      var fmt = formatOf(def);
      // Options show this field's date in each format (today until one is set).
      // Places set to different formats (by keys) can keep them.
      var own = def.els.map(function (el) { return DATE_FORMATS[el.getAttribute('data-fill-format')] ? el.getAttribute('data-fill-format') : 'spelled'; });
      var mixed = own.some(function (f) { return f !== own[0]; });
      input = '<div class="lpr-ff-icon-wrap"><input type="date" class="lpr-ff-inp lpr-ff-has-icon" data-ff-key="' + k + '" value="' + esc(raw) + '" /><span class="lpr-ff-icon" aria-hidden="true">' + CAL_ICON + '</span></div>' +
        '<div class="lpr-ff-fmt-row"><span class="lpr-ff-fmt-lbl">Format</span><select class="lpr-ff-fmt" data-ff-fmt="' + k + '" title="How this date appears in the letter' + (def.els.length > 1 ? ' (all ' + def.els.length + ' places)' : '') + '">' +
          (mixed || !fmt ? '<option value=""' + (!fmt ? ' selected' : '') + '>Different in each place</option>' : '') +
          Object.keys(DATE_FORMATS).map(function (f) {
            return '<option value="' + f + '" title="' + esc(DATE_FORMATS[f].label) + '"' + (f === fmt ? ' selected' : '') + '>' + esc(formatDate(exampleIso(raw), f)) + '</option>';
          }).join('') +
        '</select></div>';
    } else if (def.type === 'time') {
      input = '<div class="lpr-ff-icon-wrap"><input type="time" class="lpr-ff-inp lpr-ff-has-icon" data-ff-key="' + k + '" value="' + esc(raw) + '" /><span class="lpr-ff-icon" aria-hidden="true">' + CLK_ICON + '</span></div>';
    } else if (def.calc) {
      // Worked out from other fields — read-only, with its formula.
      input =
        '<div class="lpr-ff-money lpr-ff-calc">' +
          '<span class="lpr-ff-dollar">$</span>' +
          '<input type="text" class="lpr-ff-inp lpr-ff-amt-inp" data-ff-calc="' + k + '" readonly tabindex="-1" value="" />' +
        '</div>' +
        '<div class="lpr-ff-formula">= ' + esc(formulaText(def.calc)) + '</div>' +
        '<div class="lpr-ff-calc-note" data-ff-note="' + k + '"></div>';
    } else if (def.type === 'amount') {
      input =
        '<div class="lpr-ff-money">' +
          '<span class="lpr-ff-dollar">$</span>' +
          '<input type="text" class="lpr-ff-inp lpr-ff-amt-inp" data-ff-key="' + k + '" value="' + esc(raw) + '" placeholder="0.00" inputmode="decimal" />' +
        '</div>';
    } else {
      // A field in a notice's large title may run over two lines (Enter = new line).
      input = def.els.some(function (el) { return el.closest('.doc-title'); })
        ? '<textarea class="lpr-ff-inp lpr-ff-title" rows="2" data-ff-key="' + k + '" placeholder="' + esc(def.label) + '">' + esc(raw) + '</textarea>'
        : '<input type="text" class="lpr-ff-inp" data-ff-key="' + k + '" value="' + esc(raw) + '" placeholder="' + esc(def.label) + '" />';
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
  function esc(s) { return window.LPR_UTIL.esc(s); } // shared helper in user.js

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
      '  font-family:\'Montserrat\',sans-serif;font-size:12.5px;color:var(--lpr-ink);outline:none;background:#fff;}',
      '.lpr-ff-inp:focus{border-color:var(--lpr-blue);}',
      '.lpr-ff-inp[type="date"],.lpr-ff-inp[type="time"]{cursor:pointer;}',
      '.lpr-ff-calc{background:#f7f8ff;}.lpr-ff-calc .lpr-ff-amt-inp{background:transparent;color:var(--lpr-ink);font-weight:600;cursor:default;}',
      '.lpr-ff-formula{font-size:10px;color:var(--lpr-muted);}',
      '.lpr-ff-calc-note:empty{display:none;}.lpr-ff-calc-note{font-size:11px;color:var(--lpr-alert);}',
      '.lpr-ff-title{resize:vertical;font-family:inherit;line-height:1.4;}',
      '.lpr-ff-inp.lpr-ff-bad{border-color:var(--lpr-alert)!important;background:var(--lpr-alert-tint);}',
      '.lpr-ff-fmt-row{display:flex;align-items:center;gap:6px;margin-top:4px;}',
      '.lpr-ff-fmt-lbl{font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:#aaa;}',
      '.lpr-ff-fmt{flex:1;min-width:0;margin-top:0;padding:4px 6px;border:1px solid #ddd;border-radius:5px;font-family:inherit;font-size:11px;color:var(--lpr-muted);background:#fff;cursor:pointer;}',

      /* ---- dollar-amount compound field ---- */
      '.lpr-ff-money{display:flex;align-items:stretch;border:1px solid #ddd;border-radius:5px;overflow:hidden;background:#fff;}',
      '.lpr-ff-money:focus-within{border-color:var(--lpr-blue);}',
      '.lpr-ff-dollar{padding:0 8px;font-size:13px;font-weight:600;color:var(--lpr-muted);',
      '  background:#f7f8ff;border-right:1px solid #ddd;flex-shrink:0;display:flex;align-items:center;}',
      '.lpr-ff-amt-inp{border:none!important;border-radius:0;flex:1;min-width:0;}',
      '.lpr-ff-amt-inp:focus{outline:none;}',

      /* ---- footer buttons ---- */
      '.lpr-ff-foot{padding:11px 14px;border-top:1px solid #eee;flex-shrink:0;display:flex;flex-direction:column;gap:6px;}',
      '.lpr-ff-apply{width:100%;padding:10px;background:var(--lpr-blue);color:#fff;border:none;border-radius:999px;',
      '  font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s;}',
      '.lpr-ff-apply:hover{background:var(--lpr-blue-deep);}',
      '.lpr-ff-clear{width:100%;padding:7px;background:none;color:var(--lpr-blue);border:1.5px solid var(--lpr-blue);border-radius:999px;',
      '  font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;}',
      '.lpr-ff-clear:hover{background:var(--lpr-alert-tint);border-color:var(--lpr-alert);color:var(--lpr-alert);}',

      /* ---- date/time icon wrapper ---- */
      '.lpr-ff-icon-wrap{position:relative;}',
      '.lpr-ff-has-icon{padding-right:30px!important;}',
      '.lpr-ff-icon{position:absolute;right:9px;top:50%;transform:translateY(-50%);pointer-events:none;display:flex;align-items:center;opacity:.6;}',

      /* ---- placeholder on unfilled spans (screen only) ---- */
      '[data-fill-field]:empty::before{',
      '  content:attr(data-fill-placeholder);color:rgba(40,56,145,.3);',
      '  font-style:italic;font-size:.9em;border-bottom:1px dashed rgba(40,56,145,.22);pointer-events:none;}',
      '@media print{[data-fill-field]:empty::before{display:none;}}',
      /* PNG/PDF export rasterizes screen styles, so @media print never
         applies there; template-tools.js sets body.tt-rastering while
         html2canvas captures. */
      'body.tt-rastering [data-fill-field]:empty::before{display:none;}',

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
    injectStyles(); // always inject — other tabs (e.g. manual address) need these classes

    if (getFieldDefs().length === 0) return; // no fill fields on this page — stop here
    labelFillFields();
    applyAll(); // restore any previously saved values

    window.LPR_FILL_TABS = window.LPR_FILL_TABS || [];
    window.LPR_FILL_TABS.push({ id: 'fill-fields', label: 'Fields', render: render });

    window.LPR_FILL_APPLY = applyAll; // lets insert sidebar trigger a re-apply after inserting a span
    // Set a fill field by its label (field-keys.js {{title: …}} / {{badge: …}}).
    window.LPR_FILL_SET = function (label, value) {
      var def = getFieldDefs().filter(function (d) { return d.label === label; })[0];
      if (!def) return false;
      saveValue(def.key, value);
      applyField(def, value);
      return true;
    };
    window.LPR_FILL_FORMAT = { parseDate: parseDate, formatDate: formatDate, formatMoney: formatMoney, DATE_FORMATS: DATE_FORMATS };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
