/* ============================================================
   LPR Template Options  —  template-options.js
   ------------------------------------------------------------
   One shared registry + ONE "Options" tab for the Setup panel
   (the panel tenants.js builds via window.LPR_FILL_TABS).

   Instead of every template pushing its own bespoke settings tab
   (which is how the three copy-pasted manual-address tabs
   happened), a template registers a labelled group of controls:

     window.LPR_TEMPLATE_OPTIONS.push({
       id:     'com-calibration',              // stable, unique per group
       title:  'Printer Alignment (overlay mode)',
       render(container) { ... build inputs into container ... }
     });

   If nothing is ever registered, no "Options" tab appears at all
   (renderOptionsTab() is never wired into LPR_FILL_TABS). Standard
   Setup tab order becomes: Tenants · Fields · Options (tenants.js's
   renderFillPanel() sorts unknown tab ids — 'options' included —
   after 'fill-fields'/'address-fields', so no change there is
   needed).

   Load order: after fill-fields.js, before template-tools.js.

   Public API:
     window.LPR_TEMPLATE_OPTIONS  — array of {id, title, render(container)}
                                     groups. Push to it any time before
                                     the Setup panel is opened.
   ============================================================ */
(function () {
  'use strict';

  window.LPR_TEMPLATE_OPTIONS = window.LPR_TEMPLATE_OPTIONS || [];

  var TAB_ID = 'options';

  /* ================================================================
     TAB RENDER — draws every registered group into the Options tab
     ================================================================ */
  function renderOptionsTab(container) {
    var groups = window.LPR_TEMPLATE_OPTIONS || [];
    if (!groups.length) {
      container.innerHTML = '<div class="lpr-ff-empty">No options for this template.</div>';
      return;
    }
    container.innerHTML =
      '<div class="lpr-ff-body"><div class="lpr-ff-fields" id="lpr-opt-fields"></div></div>';
    var host = container.querySelector('#lpr-opt-fields');
    groups.forEach(function (g) {
      var block = document.createElement('div');
      block.className = 'lpr-opt-group';
      block.innerHTML = '<div class="lpr-opt-title">' + esc(g.title || '') + '</div>';
      host.appendChild(block);
      try {
        g.render(block);
      } catch (e) {
        console.error('[template-options] group "' + (g.id || '?') + '" failed to render', e);
      }
    });
  }

  /* ================================================================
     HELPERS
     ================================================================ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ================================================================
     STYLES — reuses fill-fields.js's .lpr-ff-* classes for the body/
     field wrapper; only the group heading is new.
     ================================================================ */
  function injectStyles() {
    if (document.getElementById('lpr-opt-css')) return;
    var s = document.createElement('style');
    s.id = 'lpr-opt-css';
    s.textContent = [
      '.lpr-opt-group{margin-bottom:18px;}',
      '.lpr-opt-group:last-child{margin-bottom:0;}',
      '.lpr-opt-title{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;',
      '  color:var(--lpr-blue);padding-bottom:6px;margin-bottom:10px;border-bottom:1px solid #eee;}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ================================================================
     INIT — only wire the "Options" tab into the Setup panel if at
     least one group has been registered. Mirrors fill-fields.js's
     own "run now if already loaded, else wait" boot pattern so this
     works whether the script tag lands before or after DOMContentLoaded.
     ================================================================ */
  function init() {
    if (!window.LPR_TEMPLATE_OPTIONS.length) return; // no tab if nothing registered
    injectStyles();
    var tabs = window.LPR_FILL_TABS = window.LPR_FILL_TABS || [];
    if (!tabs.some(function (t) { return t.id === TAB_ID; })) {
      tabs.push({ id: TAB_ID, label: 'Options', render: renderOptionsTab });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
