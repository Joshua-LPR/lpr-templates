/* ============================================================
   LPR Optional Rows  —  optional-rows.js
   ------------------------------------------------------------
   Dismiss (×) / restore (＋) for optional rows or blocks on a
   sheet — 24-Hour Notice, Occupant Update, Tenancy Confirmation.
   Replaces three copy-pasted inline scripts; styles live in
   letter.css ("Optional rows").

   Markup contract (per template — no JS needed):
     <… data-opt-row="id">            every element that hides together
     <button class="opt-dismiss no-print" data-opt-row="id"
             data-opt-label="Text on the restore button"
             [data-opt-start="removed"]>×</button>
     <div class="opt-restore-bar no-print"></div>   one per sheet

   Hidden elements get .opt-removed. The restore bar lists the
   dismissed items in button order.

   Saved Library copies: the hidden state is baked into the
   snapshot, so on reopen nothing is re-hidden (data-opt-start is
   skipped) and the restore bar is rebuilt from what is actually
   hidden — the snapshot's own restore buttons have no listeners.

   Load at the end of <body>, where the inline scripts used to be.
   ============================================================ */
(function () {
  'use strict';

  function scopeOf(el) { return el.closest('.sheet') || document; }

  function setRemoved(scope, id, removed) {
    scope.querySelectorAll('[data-opt-row="' + id + '"]').forEach(function (el) {
      el.classList.toggle('opt-removed', removed);
    });
    updateRestoreBar(scope);
  }

  function updateRestoreBar(scope) {
    var bar = scope.querySelector('.opt-restore-bar');
    if (!bar) return;
    bar.innerHTML = '';
    scope.querySelectorAll('.opt-dismiss[data-opt-row].opt-removed').forEach(function (dismiss) {
      var id = dismiss.getAttribute('data-opt-row');
      var btn = document.createElement('button');
      btn.className = 'opt-restore-btn';
      btn.innerHTML = '<span style="font-size:11px">＋</span> ' + window.LPR_UTIL.esc(dismiss.getAttribute('data-opt-label') || id);
      btn.addEventListener('click', function () { setRemoved(scope, id, false); });
      bar.appendChild(btn);
    });
  }

  function init() {
    var snapshot = !!document.documentElement.dataset.lprSnapshot;
    var scopes = [];
    document.querySelectorAll('.opt-dismiss[data-opt-row]').forEach(function (dismiss) {
      var scope = scopeOf(dismiss);
      var id = dismiss.getAttribute('data-opt-row');
      if (scopes.indexOf(scope) < 0) scopes.push(scope);
      dismiss.addEventListener('click', function () { setRemoved(scope, id, true); });
      if (!snapshot && dismiss.getAttribute('data-opt-start') === 'removed') setRemoved(scope, id, true);
    });
    scopes.forEach(updateRestoreBar);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
