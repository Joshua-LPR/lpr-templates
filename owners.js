/* ============================================================
   LPR Sender / Rental Owner System  —  owners.js
   ------------------------------------------------------------
   Registers itself as a "Sender" tab inside the Fill Fields
   panel (managed by tenants.js). No separate toolbar button.

   Template markup:
     <span data-owner-field="name">LPR Management, LLC</span>
     <span class="owner-sep"> · </span>   ← hidden in no-signer mode

   No-signer mode:
     Adds .owner-no-signer to .sheet — CSS hides .signature,
     [data-employee-field="name"], [data-employee-field="title"],
     and .owner-sep, leaving only the LLC name.

   CSV import reads the Buildium rental owners CSV export.
   Accepted column names: "Name", "Company name", or "LegalName".
   Owner list stored in lpr_owners (localStorage), persists across sessions.
   Selected owner and signer toggle reset to defaults on each page load.
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY  = 'lpr_owners';
  const DEFAULT      = 'LPR Management, LLC';
  const OFFICE_PHONE = '443.402.5641';
  const OFFICE_EMAIL = 'office@lasalleparkrealty.com';

  /* ================================================================
     STORAGE
     ================================================================ */
  function loadOwners() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!Array.isArray(raw) || raw.length === 0) return [DEFAULT];
      if (!raw.includes(DEFAULT)) raw.unshift(DEFAULT);
      return raw;
    } catch (e) { return [DEFAULT]; }
  }

  function saveOwners(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  /* ================================================================
     CSV PARSER
     ================================================================ */
  function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (!lines.length) return [];
    const headers = splitLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const vals = splitLine(lines[i]);
      const row  = {};
      headers.forEach((h, j) => { row[h.replace(/^﻿/, '').trim()] = (vals[j] || '').trim(); });
      rows.push(row);
    }
    return rows;
  }

  function splitLine(line) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
      else cur += c;
    }
    result.push(cur);
    return result;
  }

  /* ================================================================
     IMPORT
     ================================================================ */
  function importCSV(text) {
    const rows  = parseCSV(text);
    const names = [];
    rows.forEach(row => {
      // Try several column names the Buildium export may use
      const name = (row['Name'] || row['Company name'] || row['LegalName'] || '').trim();
      if (name && name !== DEFAULT && !names.includes(name)) names.push(name);
    });
    names.sort();
    names.unshift(DEFAULT); // always first
    saveOwners(names);
    return names;
  }

  /* ================================================================
     SESSION STATE  (resets each page load)
     ================================================================ */
  let selectedOwner    = DEFAULT;
  let includeSigner    = true;
  let includeTitle     = true;
  let useOfficeContact = false;
  let ownerImportMsg   = '';
  let _empPhone        = null;
  let _empEmail        = null;

  /* ================================================================
     APPLY TO PAGE
     ================================================================ */
  function cacheEmployeeContact() {
    if (_empPhone !== null) return;
    const ph = document.querySelector('[data-employee-field="phone"]');
    const em = document.querySelector('[data-employee-field="email"]');
    _empPhone = ph ? ph.textContent : '';
    _empEmail = em ? em.textContent : '';
  }

  function applyOwner() {
    document.querySelectorAll('[data-owner-field="name"]').forEach(el => {
      el.textContent = selectedOwner;
    });
    document.querySelectorAll('.sheet').forEach(s => {
      s.classList.toggle('owner-no-signer', !includeSigner);
      s.classList.toggle('owner-no-title',  !includeTitle);
    });
    cacheEmployeeContact();
    const useOffice = !includeSigner || useOfficeContact;
    document.querySelectorAll('[data-employee-field="phone"]').forEach(el => {
      el.textContent = useOffice ? OFFICE_PHONE : _empPhone;
    });
    document.querySelectorAll('[data-employee-field="email"]').forEach(el => {
      el.textContent = useOffice ? OFFICE_EMAIL : _empEmail;
    });
  }

  function initFields() {
    document.querySelectorAll('[data-owner-field="name"]').forEach(el => {
      if (!el.textContent.trim()) el.textContent = DEFAULT;
    });
  }

  /* ================================================================
     SENDER TAB CONTENT
     ================================================================ */
  function renderSenderContent(container) {
    const owners = loadOwners();

    container.innerHTML = `
      <div class="lpr-tp-import-row">
        <label class="lpr-tp-import-btn">
          <input type="file" accept=".csv" id="lpr-own-file" hidden/>
          ↑ Import CSV
        </label>
        <span class="lpr-tp-count">${owners.length} owner${owners.length !== 1 ? 's' : ''}</span>
      </div>
      ${ownerImportMsg ? `<div class="lpr-tp-msg">${esc(ownerImportMsg)}</div>` : ''}

      <div class="lpr-own-list">
        ${owners.map(name => `
          <div class="lpr-own-item${name === selectedOwner ? ' sel' : ''}" data-name="${esc(name)}">
            ${esc(name)}
          </div>`).join('')}
      </div>

      <div class="lpr-own-toggle-row">
        <label class="lpr-own-toggle-label">
          <input type="checkbox" id="lpr-own-signer" ${includeSigner ? 'checked' : ''}/>
          <span>Include signer name</span>
        </label>
      </div>
      <div class="lpr-own-toggle-row lpr-own-sub-toggle${!includeSigner ? ' dim' : ''}">
        <label class="lpr-own-toggle-label">
          <input type="checkbox" id="lpr-own-title" ${includeTitle ? 'checked' : ''}${!includeSigner ? ' disabled' : ''}/>
          <span>Include title</span>
        </label>
      </div>
      <div class="lpr-own-toggle-row lpr-own-sub-toggle${!includeSigner ? ' dim' : ''}">
        <label class="lpr-own-toggle-label">
          <input type="checkbox" id="lpr-own-office" ${useOfficeContact ? 'checked' : ''}${!includeSigner ? ' disabled' : ''}/>
          <span>Use office contact</span>
        </label>
      </div>

      <div class="lpr-tp-foot">
        <button id="lpr-own-apply" class="lpr-tp-apply">Apply to Template</button>
      </div>
    `;

    const fileInput = document.getElementById('lpr-own-file');
    if (fileInput) {
      fileInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const names = importCSV(ev.target.result);
          ownerImportMsg = `✓ ${names.length} owners loaded`;
          const body = document.getElementById('lpr-tab-body');
          if (body) renderSenderContent(body);
        };
        reader.readAsText(file);
      };
    }

    container.querySelectorAll('.lpr-own-item').forEach(el => {
      el.onclick = () => {
        selectedOwner  = el.dataset.name;
        ownerImportMsg = '';
        const body = document.getElementById('lpr-tab-body');
        if (body) renderSenderContent(body);
      };
    });

    const signerCb   = document.getElementById('lpr-own-signer');
    const titleCb    = document.getElementById('lpr-own-title');
    const officeCb   = document.getElementById('lpr-own-office');
    const subToggles = document.querySelectorAll('.lpr-own-sub-toggle');
    if (signerCb) signerCb.onchange = e => {
      includeSigner = e.target.checked;
      if (titleCb)  titleCb.disabled  = !includeSigner;
      if (officeCb) officeCb.disabled = !includeSigner;
      subToggles.forEach(st => st.classList.toggle('dim', !includeSigner));
    };
    if (titleCb)  titleCb.onchange  = e => { includeTitle      = e.target.checked; };
    if (officeCb) officeCb.onchange = e => { useOfficeContact  = e.target.checked; };

    const applyBtn = document.getElementById('lpr-own-apply');
    if (applyBtn) {
      applyBtn.onclick = () => {
        applyOwner();
        applyBtn.textContent = '✓ Applied';
        applyBtn.classList.add('ok');
        setTimeout(() => { applyBtn.textContent = 'Apply to Template'; applyBtn.classList.remove('ok'); }, 1800);
      };
    }
  }

  /* ================================================================
     STYLES
     ================================================================ */
  function injectStyles() {
    if (document.getElementById('lpr-owner-css')) return;
    const s = document.createElement('style');
    s.id = 'lpr-owner-css';
    s.textContent = `
      .lpr-own-list {
        flex: 1; overflow-y: auto; border-bottom: 1px solid #eee;
      }
      .lpr-own-item {
        padding: 10px 16px; cursor: pointer;
        border-bottom: 1px solid #f2f2f2;
        font-size: 12.5px; color: #0e1430;
        transition: background .1s; line-height: 1.35;
      }
      .lpr-own-item:hover { background: #f7f8ff; }
      .lpr-own-item.sel {
        background: #eef0fb; border-left: 3px solid #283891;
        padding-left: 13px; font-weight: 600;
      }

      .lpr-own-toggle-row {
        padding: 13px 16px; border-bottom: 1px solid #eee; flex-shrink: 0;
      }
      .lpr-own-toggle-label {
        display: flex; align-items: center; gap: 9px;
        font-size: 12.5px; color: #0e1430; cursor: pointer; user-select: none;
      }
      .lpr-own-toggle-label input[type="checkbox"] {
        width: 15px; height: 15px; accent-color: #283891; cursor: pointer; flex-shrink: 0;
      }

      /* ---- No-signer mode ---- */
      .sheet.owner-no-signer .signature,
      .sheet.owner-no-signer [data-employee-field="name"],
      .sheet.owner-no-signer [data-employee-field="title"],
      .sheet.owner-no-signer .owner-sep { display: none; }
      .sheet.owner-no-signer [data-employee-hide-if-empty] { display: block !important; }
      /* Promote the LLC name to match the signed-name style */
      .sheet.owner-no-signer .signed-role {
        font-size: inherit; font-weight: 600; color: var(--lpr-ink);
      }

      /* ---- No-title mode (signer still present) ---- */
      .sheet.owner-no-title [data-employee-field="title"],
      .sheet.owner-no-title .owner-sep { display: none; }
      .sheet.owner-no-title [data-employee-hide-if-empty] { display: block !important; }

      /* ---- Sub-toggle dim when signer is off ---- */
      .lpr-own-sub-toggle { padding-left: 28px; }
      .lpr-own-sub-toggle.dim { opacity: 0.38; pointer-events: none; }

      @media print {
        .sheet.owner-no-signer .signature,
        .sheet.owner-no-signer [data-employee-field="name"],
        .sheet.owner-no-signer [data-employee-field="title"],
        .sheet.owner-no-signer .owner-sep { display: none !important; }
        .sheet.owner-no-signer [data-employee-hide-if-empty] { display: block !important; }
        .sheet.owner-no-signer .signed-role {
          font-size: inherit !important; font-weight: 600 !important; color: var(--lpr-ink) !important;
        }
        .sheet.owner-no-title [data-employee-field="title"],
        .sheet.owner-no-title .owner-sep { display: none !important; }
        .sheet.owner-no-title [data-employee-hide-if-empty] { display: block !important; }
      }
    `;
    document.head.appendChild(s);
  }

  /* ================================================================
     INIT
     ================================================================ */
  function init() {
    // Only activate on pages that have owner fields
    if (!document.querySelector('[data-owner-field]')) return;

    injectStyles();
    initFields();

    // Register as a tab in the Fill Fields panel
    window.LPR_FILL_TABS = window.LPR_FILL_TABS || [];
    window.LPR_FILL_TABS.unshift({ id: 'sender', label: 'Sender', render: renderSenderContent });
  }

  /* ================================================================
     HELPERS
     ================================================================ */
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
