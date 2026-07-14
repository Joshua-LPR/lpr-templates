/* ============================================================
   LPR Manual Address  —  manual-address.js
   ------------------------------------------------------------
   Shared "type in a recipient by hand" module. Certificate of
   Mailing, P-touch address labels, and Shipping Labels (Avery
   5168) each used to copy-paste a near-identical Fields tab that
   wrote name/address_line1/address_line2/city/state/zip into
   [data-contact-field] spans. This is the single deduped version.

   Template markup (unchanged from the copy-pasted versions):
     <span data-contact-field="name"></span>
     <span data-contact-field="address_line1"></span>
     <span data-contact-field="address_line2"></span>
     <span data-contact-field="city"></span>
     <span data-contact-field="state"></span>
     <span data-contact-field="zip"></span>

   Storage: lpr_addr_<pageKey>  (pageKey = fill-fields.js's basename
   scheme, duplicated here since fill-fields.js does not export it).

   Legacy-key adoption (R2 in the Track 4 design spec): the three
   templates being migrated onto this module used their own ad hoc
   keys (lpr_ptouch_manual, lpr_cof_manual, lpr_5168_manual). The
   very first time this module's canonical key is read on a known
   page and it's empty, the matching legacy key's value (if any) is
   copied over so previously typed addresses survive the migration.
   A consumer can also pass extra legacy keys explicitly via
   register({ legacyKeys: [...] }) — used by pages this module does
   not have a built-in mapping for.

   Load order: after fill-fields.js (its injectStyles() runs
   unconditionally and provides the .lpr-ff-* classes reused here).

   Public API:
     window.LPR_MANUAL_ADDRESS = {
       FIELDS,                 // [[key, label], ...] canonical 6 fields
       key(),                  // canonical localStorage key for this page
       apply(vals),            // write vals[key] -> [data-contact-field=key] spans
       render(container),      // build the inputs tab/group UI
       register(opts)          // wire it into the Setup panel — see below
     }

   register(opts):
     opts.replaceFillTab  — remove fill-fields.js's generic empty
                             'fill-fields' tab first (P-touch/Shipping
                             have no data-fill-field spans, so this
                             module's tab becomes their only "Fields" tab).
     opts.asOptions       — register as a Template Options group
                             (via template-options.js) instead of a
                             primary Setup tab (CoM: keeps its own
                             Fields tab for fill-fields, address block
                             becomes an Options group).
     opts.legacyKeys      — string[] of extra localStorage keys to check
                             for adoption, in addition to any built-in
                             match for the current page.
     opts.title           — Options-group title when opts.asOptions
                             (default 'Recipient Address').
     opts.label           — Setup-tab label when !opts.asOptions
                             (default 'Fields').
   ============================================================ */
(function () {
  'use strict';

  /* ================================================================
     PAGE KEY — duplicated from fill-fields.js's basename scheme so
     this module has no hard dependency on fill-fields.js internals.
     ================================================================ */
  var PAGE_KEY = (function () {
    var basename = (location.pathname.split('/').pop() || 'page').replace(/\.html?$/i, '');
    if (basename === 'view') {
      var id = new URLSearchParams(location.search).get('id');
      if (id) {
        var sanitized = String(id).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        if (sanitized) return basename + '_' + sanitized;
      }
    }
    return basename;
  })();

  var STORAGE_KEY = 'lpr_addr_' + PAGE_KEY;

  /* Known legacy keys from the three pre-Track-4 copy-pasted tabs,
     keyed by the exact page basename as PAGE_KEY actually computes it
     (fill-fields.js's scheme — no slugifying, case preserved). Browsers
     normalize spaces in a file:// path to %20 in location.pathname
     (true whether the page was opened via a typed path or a relative
     <a href> click from index.html), so the basename PAGE_KEY reads
     off these three filenames comes out percent-encoded, not literal. */
  var LEGACY_KEYS_BY_PAGE = {
    'Address%20Labels%20P-touch':             'lpr_ptouch_manual',
    'Certificate%20of%20Mailing':              'lpr_cof_manual',
    'Shipping%20Labels%20-%20Avery%205168':    'lpr_5168_manual'
  };

  var FIELDS = [
    ['name',          'Recipient Name'],
    ['address_line1', 'Street Address'],
    ['address_line2', 'Address Line 2'],
    ['city',          'City'],
    ['state',         'State'],
    ['zip',           'Zip']
  ];

  var registered = false; // guards against double register() calls

  /* ================================================================
     STORAGE
     ================================================================ */
  function key() { return STORAGE_KEY; }

  function loadValues() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function saveValues(vals) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vals));
  }

  /* One-time legacy-key adoption: if the canonical key has never been
     written on this page but a legacy key has data, copy it over so
     saved addresses survive the migration to this shared module. */
  function adoptLegacy(extraKeys) {
    if (localStorage.getItem(STORAGE_KEY) != null) return; // already canonical
    var candidates = [].concat(extraKeys || [], LEGACY_KEYS_BY_PAGE[PAGE_KEY] || []);
    for (var i = 0; i < candidates.length; i++) {
      var raw = localStorage.getItem(candidates[i]);
      if (raw == null) continue;
      try {
        JSON.parse(raw); // validate before adopting verbatim
        localStorage.setItem(STORAGE_KEY, raw);
      } catch (e) {
        continue; // corrupt legacy value — skip, try next candidate
      }
      return;
    }
  }

  /* ================================================================
     APPLY — pure setter: writes vals[key] onto every matching
     [data-contact-field=key] span on the page.
     ================================================================ */
  function apply(vals) {
    vals = vals || {};
    FIELDS.forEach(function (pair) {
      var k = pair[0];
      var v = vals[k] || '';
      document.querySelectorAll('[data-contact-field="' + k + '"]').forEach(function (el) {
        el.textContent = v;
      });
    });
  }

  function applyStored() { apply(loadValues()); }

  /* ================================================================
     TAB / GROUP RENDER
     ================================================================ */
  function render(container) {
    var v = loadValues();

    container.innerHTML =
      '<div class="lpr-ff-body">' +
        '<div class="lpr-ff-fields">' +
          '<div class="lpr-ff-field">' +
            '<label class="lpr-ff-lbl">Recipient Name</label>' +
            '<input class="lpr-ff-inp" type="text" data-addr-key="name" placeholder="Full name" value="' + esc(v.name) + '">' +
          '</div>' +
          '<div class="lpr-ff-field">' +
            '<label class="lpr-ff-lbl">Street Address</label>' +
            '<input class="lpr-ff-inp" type="text" data-addr-key="address_line1" placeholder="Street address" value="' + esc(v.address_line1) + '">' +
          '</div>' +
          '<div class="lpr-ff-field">' +
            '<label class="lpr-ff-lbl">Address Line 2 <span class="lpr-ff-lbl-note">(optional)</span></label>' +
            '<input class="lpr-ff-inp" type="text" data-addr-key="address_line2" placeholder="Unit, Apt, Suite…" value="' + esc(v.address_line2) + '">' +
          '</div>' +
          '<div class="lpr-ff-field">' +
            '<label class="lpr-ff-lbl">City / State / Zip</label>' +
            '<div class="lpr-ff-csz">' +
              '<input class="lpr-ff-inp" type="text" data-addr-key="city" placeholder="City" value="' + esc(v.city) + '">' +
              '<input class="lpr-ff-inp ff-st" type="text" data-addr-key="state" placeholder="ST" value="' + esc(v.state) + '">' +
              '<input class="lpr-ff-inp ff-zip" type="text" data-addr-key="zip" placeholder="Zip" value="' + esc(v.zip) + '">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="lpr-ff-foot">' +
          '<button class="lpr-ff-clear" id="lpr-addr-clear">Clear Address</button>' +
        '</div>' +
      '</div>';

    container.querySelectorAll('[data-addr-key]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.getAttribute('data-addr-key');
        var vals = loadValues();
        vals[k] = inp.value;
        saveValues(vals);
        apply(vals);
      });
    });

    var clearBtn = container.querySelector('#lpr-addr-clear');
    if (clearBtn) {
      clearBtn.onclick = function () {
        localStorage.removeItem(STORAGE_KEY);
        apply({});
        render(container); // rebuild so inputs reflect the cleared state
      };
    }
  }

  /* ================================================================
     REGISTER — wires this module into the Setup panel / Options tab.

     The actual LPR_FILL_TABS/LPR_TEMPLATE_OPTIONS mutation is deferred
     with the same "run now if the document is already parsed, else
     wait for DOMContentLoaded" pattern tenants.js/fill-fields.js use
     for their own tab registration. This matters when a consumer
     calls register() from a plain synchronous inline <script> (as the
     three legacy templates did): tenants.js/fill-fields.js/
     template-options.js all defer THEIR tab pushes to DOMContentLoaded
     too, so an undeferred register() could run before fill-fields.js
     has pushed its 'fill-fields' tab — making opts.replaceFillTab find
     nothing to remove. Deferring to DOMContentLoaded, and relying on
     script-tag document order for listener-registration order, keeps
     this reliable as long as manual-address.js's <script> tag (and any
     register() call) loads after fill-fields.js's, per this file's
     header contract.
     ================================================================ */
  function register(opts) {
    opts = opts || {};

    function run() {
      adoptLegacy(opts.legacyKeys);
      injectStyles();
      applyStored(); // restore saved values on the page immediately

      var tabs = window.LPR_FILL_TABS = window.LPR_FILL_TABS || [];

      if (opts.replaceFillTab) {
        var idx = tabs.findIndex(function (t) { return t.id === 'fill-fields'; });
        if (idx !== -1) tabs.splice(idx, 1);
      }

      if (opts.asOptions) {
        var groups = window.LPR_TEMPLATE_OPTIONS = window.LPR_TEMPLATE_OPTIONS || [];
        if (!groups.some(function (g) { return g.id === 'manual-address'; })) {
          groups.push({ id: 'manual-address', title: opts.title || 'Recipient Address', render: render });
        }
      } else if (!tabs.some(function (t) { return t.id === 'address-fields'; })) {
        tabs.push({ id: 'address-fields', label: opts.label || 'Fields', render: render });
      }

      registered = true;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  /* ================================================================
     HELPERS
     ================================================================ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ================================================================
     STYLES — the combined City/State/Zip row isn't part of
     fill-fields.js's shared CSS (it was previously duplicated inline
     in each of the three templates); this module owns it now so
     consumers need no per-page CSS of their own.
     ================================================================ */
  function injectStyles() {
    if (document.getElementById('lpr-addr-css')) return;
    var s = document.createElement('style');
    s.id = 'lpr-addr-css';
    s.textContent = [
      '.lpr-ff-csz{display:flex;gap:6px;}',
      '.lpr-ff-csz .lpr-ff-inp{flex:1;min-width:0;}',
      '.lpr-ff-csz .lpr-ff-inp.ff-st{flex:0 0 52px;}',
      '.lpr-ff-csz .lpr-ff-inp.ff-zip{flex:0 0 82px;}',
      '.lpr-ff-lbl-note{font-weight:400;letter-spacing:0;text-transform:none;color:var(--lpr-muted);}'
    ].join('');
    document.head.appendChild(s);
  }

  window.LPR_MANUAL_ADDRESS = {
    FIELDS: FIELDS,
    key: key,
    apply: apply,
    render: render,
    register: register
  };
})();
