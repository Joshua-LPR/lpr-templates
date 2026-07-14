/* ============================================================
   LPR Mode Bar — mode-bar.js
   ------------------------------------------------------------
   Standardized mode-bar contract for templates with multiple
   on-page variants (Security Deposit, Utilities Addendum,
   Certificate of Mailing, Envelope, Letterhead, Yard Sign, …).

   Replaces the per-template `data-sd-mode` / `data-ua-mode` /
   id-based-button / private-cloneNode-override pattern with one
   shared markup contract, one persistence scheme, and one
   export-clean hook.

   Load order: AFTER fill-fields.js, BEFORE template-tools.js.
   (template-tools.js's exportHtml()/buildSaveHtml() both call
   document.documentElement.cloneNode(true); the override installed
   below must already be in place by the time those run.)

   Markup contract
   ------------------------------------------------------------
     <div class="mode-bar no-print" data-mode-group="doc" data-mode-key="sd">
       <button class="mode-btn active" data-mode="withheld">Withheld</button>
       <button class="mode-btn"        data-mode="partial">Partial Refund</button>
       <button class="mode-btn"        data-mode="returned">Full Refund</button>
     </div>

     <div class="sheet letter" data-mode-when="doc:withheld"> … </div>
     <div class="sheet letter" data-mode-when="doc:partial">  … </div>

     - data-mode-group  names an independent group. Optional — defaults
       to "doc". A page may have several bars (e.g. Yard Sign:
       "design" + "qr-side") switched fully independently of each other.
     - data-mode-key    optional persistence-key suffix for the group;
       defaults to the group name.
     - data-mode-when="<group>:<mode>" on ANY element (sheet, region,
       style scope) means "visible only when that group is in that
       mode." Elements without the attribute are always visible.
     - The active button carries .active; hidden targets get .mode-hidden.

   Public API
   ------------------------------------------------------------
     window.LPR_MODEBAR = {
       get(group)        -> current mode string for group, or null
       set(group, mode)  -> switch programmatically (same effect as a click)
       groups()          -> array of group names currently tracked
     }

   Events
   ------------------------------------------------------------
     document.dispatchEvent(new CustomEvent('lpr:modechange', {
       detail: { group: <group>, mode: <mode> }
     }))
     Fired on every applyMode() call, including the one at page load —
     so templates with bespoke per-mode logic (CoM's page-style swap,
     Envelope's env-rec-fill recompute) can do all of their work from a
     single 'lpr:modechange' listener with no separate init-time path.

   Storage
   ------------------------------------------------------------
     lpr_mode_<pageKey>_<key>  (string mode id)
     <pageKey> uses the exact same basename scheme as fill-fields.js
     (including its view.html?id= special case) so a page's mode and
     fill-field state always key off the same page identity.
     Keys are transparently per-user namespaced by user.js's
     localStorage monkey-patch — this module does not need its own
     user-awareness.

   Central export scrub
   ------------------------------------------------------------
     Installs a single override of document.documentElement.cloneNode
     that, on every clone, removes .mode-hidden and .mode-bar nodes so
     template-tools.js's exportHtml()/buildSaveHtml() (both of which
     clone document.documentElement) automatically capture only the
     active variant. This replaces every per-template cloneNode hack.
     For legacy safety during the migration window it also strips the
     older hidden-class names (.sd-hidden, .ua-simple[hidden]) so a
     template that hasn't been migrated to data-mode-when yet still
     exports cleanly once mode-bar.js is dropped onto it.
   ============================================================ */
(function () {
  'use strict';

  /* ---- page identity (must match fill-fields.js's PAGE_KEY scheme) ---- */
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

  var state = {}; // group -> current mode

  function storageKey(group, key) {
    return 'lpr_mode_' + PAGE_KEY + '_' + (key || group);
  }

  function groupOf(bar) {
    return bar.getAttribute('data-mode-group') || 'doc';
  }

  // First .mode-bar in document order belonging to `group` — the single
  // source of truth for that group's persistence key and button set.
  function resolveBar(group) {
    var bars = document.querySelectorAll('.mode-bar');
    for (var i = 0; i < bars.length; i++) {
      if (groupOf(bars[i]) === group) return bars[i];
    }
    return null;
  }

  function resolveKey(group) {
    var bar = resolveBar(group);
    return (bar && bar.getAttribute('data-mode-key')) || group;
  }

  /* ---- core: apply a mode to a group ---- */
  function applyMode(group, mode) {
    if (!group || !mode) return;

    // 1. toggle .active on this group's buttons (across all its bars)
    document.querySelectorAll('.mode-bar').forEach(function (bar) {
      if (groupOf(bar) !== group) return;
      bar.querySelectorAll('.mode-btn[data-mode]').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
      });
    });

    // 2. toggle .mode-hidden on [data-mode-when="<group>:<mode>"] targets
    //    (by exact match, scoped to this group's elements only)
    var wanted = group + ':' + mode;
    document.querySelectorAll('[data-mode-when]').forEach(function (el) {
      var val = el.getAttribute('data-mode-when') || '';
      var sep = val.indexOf(':');
      if (sep === -1 || val.slice(0, sep) !== group) return;
      el.classList.toggle('mode-hidden', val !== wanted);
    });

    // 3. body class token mode-<group>-<mode> (remove this group's other tokens)
    var tokenPrefix = 'mode-' + group + '-';
    Array.prototype.slice.call(document.body.classList).forEach(function (cls) {
      if (cls.indexOf(tokenPrefix) === 0) document.body.classList.remove(cls);
    });
    document.body.classList.add(tokenPrefix + mode);

    // 4. persist
    state[group] = mode;
    try { localStorage.setItem(storageKey(group, resolveKey(group)), mode); } catch (e) {}

    // 5. notify
    document.dispatchEvent(new CustomEvent('lpr:modechange', { detail: { group: group, mode: mode } }));
  }

  function initGroup(group) {
    var bar = resolveBar(group);
    if (!bar) return;
    var mode = null;
    try { mode = localStorage.getItem(storageKey(group, resolveKey(group))); } catch (e) {}
    if (!mode) {
      var activeBtn = bar.querySelector('.mode-btn.active[data-mode]');
      var firstBtn = bar.querySelector('.mode-btn[data-mode]');
      mode = (activeBtn && activeBtn.getAttribute('data-mode')) ||
             (firstBtn && firstBtn.getAttribute('data-mode')) || null;
    }
    if (mode) applyMode(group, mode);
  }

  function init() {
    var seen = {};
    document.querySelectorAll('.mode-bar').forEach(function (bar) {
      var group = groupOf(bar);
      if (seen[group]) return;
      seen[group] = true;
      initGroup(group);
    });

    // Click delegation — one listener for every mode-bar on the page.
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.mode-btn[data-mode]');
      if (!btn) return;
      var bar = btn.closest('.mode-bar');
      if (!bar) return;
      applyMode(groupOf(bar), btn.getAttribute('data-mode'));
    });
  }

  /* ---- central export scrub: one cloneNode override for every template ---- */
  (function installExportScrub() {
    var target = document.documentElement;
    var origCloneNode = target.cloneNode.bind(target);
    document.documentElement.cloneNode = function (deep) {
      var clone = origCloneNode(deep);
      // Standardized contract
      clone.querySelectorAll('.mode-hidden, .mode-bar').forEach(function (el) { el.remove(); });
      // Legacy safety net for templates not yet migrated off their private
      // hidden-class names — harmless no-op once a template has migrated.
      clone.querySelectorAll('.sd-hidden, .ua-simple[hidden]').forEach(function (el) { el.remove(); });
      return clone;
    };
  })();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.LPR_MODEBAR = {
    get: function (group) { return state[group] || null; },
    set: function (group, mode) { applyMode(group, mode); },
    groups: function () { return Object.keys(state); }
  };
})();
