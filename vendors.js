/* ============================================================
   LPR Vendor System  —  vendors.js
   ------------------------------------------------------------
   Registers as a "Vendors" tab inside the Setup panel.

   Template markup:
     <span data-vendor-field="name"></span>
     <span data-vendor-field="address_line1"></span>

   Apply as Recipient fills data-vendor-field AND data-contact-field.
   Apply body fields only fills data-vendor-field.

   Storage key: lpr_vendors (localStorage), persists across sessions.
   CSV import reads Buildium vendor CSV export.
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'lpr_vendors';

  const CSV_MAP = {
    'Vendor Name *':                       'name',
    'Address Line 1 (optional)':           'address_line1',
    'Address Line 2 (optional)':           'address_line2',
    'City/Locality (optional)':            'city',
    'State/Province/Territory (optional)': 'state',
    'Postal code (optional)':              'zip',
    'Login email (optional)':              'email1',
    'Alternate email (optional)':          'email2',
    'Work phone (optional)':               'phone',
    'Mobile (optional)':                   'mobile',
  };

  const FIELD_LABELS = {
    name:          'Vendor Name',
    address_line1: 'Street Address',
    address_line2: 'Address Line 2',
    city:          'City',
    state:         'State',
    zip:           'Zip',
    email1:        'Email (Primary)',
    email2:        'Email (Alternate)',
    phone:         'Work Phone',
    mobile:        'Mobile',
  };

  const ALL_FIELDS = Object.keys(FIELD_LABELS);

  /* ================================================================
     STORAGE
     ================================================================ */
  function loadVendors() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveVendors(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* ================================================================
     DATA HELPERS
     ================================================================ */
  function computeEffective(vendor) {
    const eff = {};
    ALL_FIELDS.forEach(f => {
      eff[f] = (vendor.overrides && vendor.overrides[f] != null)
        ? vendor.overrides[f]
        : (vendor.source[f] || '');
    });
    return eff;
  }

  function saveOverride(vendorId, field, value) {
    const data = loadVendors();
    const v = data[vendorId];
    if (!v) return null;
    if (!v.overrides) v.overrides = {};
    if (value === v.source[field]) {
      delete v.overrides[field];
    } else {
      v.overrides[field] = value;
    }
    v.effective = computeEffective(v);
    saveVendors(data);
    return data[vendorId];
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
      const row = {};
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
      } else if (c === ',' && !inQ) {
        result.push(cur); cur = '';
      } else cur += c;
    }
    result.push(cur);
    return result;
  }

  /* ================================================================
     IMPORT / MERGE
     ================================================================ */
  function importCSV(text) {
    const rows = parseCSV(text);
    const data = loadVendors();
    let added = 0, updated = 0, unchanged = 0;

    rows.forEach(row => {
      const id = (row['Id (optional)'] || row['Id'] || '').trim()
               || (row['Vendor Name *'] || '').trim();
      if (!id) return;

      const source = {};
      ALL_FIELDS.forEach(f => {
        const col = Object.entries(CSV_MAP).find(([, v]) => v === f)?.[0];
        source[f] = col ? (row[col] || '').trim() : '';
      });

      if (!data[id]) {
        data[id] = { _id: id, source, overrides: {}, effective: { ...source } };
        added++;
      } else {
        const changed = ALL_FIELDS.some(f => (data[id].source[f] || '') !== source[f]);
        ALL_FIELDS.forEach(f => {
          if (data[id].overrides?.[f] === source[f]) delete data[id].overrides[f];
        });
        data[id].source = source;
        data[id].effective = computeEffective(data[id]);
        if (changed) updated++; else unchanged++;
      }
    });

    saveVendors(data);
    return { added, updated, unchanged, total: Object.keys(data).length };
  }

  /* ================================================================
     APPLY TO PAGE
     ================================================================ */
  function applyVendor(vendor) {
    document.querySelectorAll('[data-vendor-field]').forEach(el => {
      const f = el.getAttribute('data-vendor-field');
      el.textContent = vendor.effective[f] || '';
    });
  }

  function applyVendorAsRecipient(vendor) {
    applyVendor(vendor);
    const contactMap = {
      name:          vendor.effective.name,
      address_line1: vendor.effective.address_line1,
      address_line2: vendor.effective.address_line2,
      city:          vendor.effective.city,
      state:         vendor.effective.state,
      zip:           vendor.effective.zip,
      email:         vendor.effective.email1,
      phone:         vendor.effective.phone,
    };
    document.querySelectorAll('[data-contact-field]').forEach(el => {
      const f = el.getAttribute('data-contact-field');
      if (f in contactMap) el.textContent = contactMap[f] || '';
    });
  }

  /* ================================================================
     LABEL FIELDS — placeholder display
     ================================================================ */
  function labelVendorFields() {
    document.querySelectorAll('[data-vendor-field]').forEach(el => {
      const key = el.getAttribute('data-vendor-field');
      if (FIELD_LABELS[key]) el.setAttribute('data-vendor-label', FIELD_LABELS[key]);
    });
  }

  /* ================================================================
     SESSION STATE
     ================================================================ */
  let selectedId = null;
  let searchQ    = '';
  let importMsg  = '';

  /* ================================================================
     RENDER TAB CONTENT
     ================================================================ */
  function renderVendorContent(container, opts) {
    const data     = loadVendors();
    const all      = Object.values(data);
    const q        = searchQ.toLowerCase();
    const filtered = all
      .filter(v => !q || (v.effective.name || '').toLowerCase().includes(q))
      .sort((a, b) => (a.effective.name || '').localeCompare(b.effective.name || ''));

    const sel = selectedId ? data[selectedId] : null;

    container.innerHTML = `
      <div class="lpr-tp-import-row">
        <label class="lpr-tp-import-btn">
          <input type="file" accept=".csv" id="lpr-vnd-file" hidden/>
          ↑ Import CSV
        </label>
        <span class="lpr-tp-count">${all.length} vendor${all.length !== 1 ? 's' : ''}</span>
      </div>
      ${importMsg ? `<div class="lpr-tp-msg">${esc(importMsg)}</div>` : ''}

      <div class="lpr-tp-search-wrap">
        <input id="lpr-vnd-q" class="lpr-tp-q" type="text"
               placeholder="Search…" value="${esc(searchQ)}"/>
      </div>

      <div class="lpr-tp-list">
        ${filtered.length === 0
          ? `<div class="lpr-tp-empty">${all.length === 0 ? 'Import a CSV to get started' : 'No matches'}</div>`
          : filtered.map(v => `
              <div class="lpr-tp-item${v._id === selectedId ? ' sel' : ''}" data-id="${esc(v._id)}">
                <div class="lpr-tp-name">${esc(v.effective.name || '—')}</div>
                <div class="lpr-tp-addr">${esc(v.effective.address_line1 || '')}${v.effective.city ? ' · ' + esc(v.effective.city) : ''}</div>
              </div>`).join('')}
      </div>

      ${sel ? renderEditor(sel) : `<div class="lpr-tp-no-sel">← Select a vendor above</div>`}
    `;

    const fileInput = document.getElementById('lpr-vnd-file');
    if (fileInput) fileInput.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const res = importCSV(ev.target.result);
        importMsg = `✓ ${res.added} added · ${res.updated} updated · ${res.unchanged} unchanged`;
        const body = document.getElementById('lpr-tab-body');
        if (body) renderVendorContent(body, opts);
      };
      reader.readAsText(file);
    };

    const qEl = document.getElementById('lpr-vnd-q');
    if (qEl) qEl.oninput = e => {
      searchQ = e.target.value;
      const body = document.getElementById('lpr-tab-body');
      if (body) renderVendorContent(body, { refocus: true });
    };

    container.querySelectorAll('.lpr-tp-item').forEach(el => {
      el.onclick = () => {
        selectedId = el.dataset.id;
        importMsg  = '';
        const body = document.getElementById('lpr-tab-body');
        if (body) renderVendorContent(body);
      };
    });

    if (sel) wireEditor(sel);
    if (opts?.refocus) {
      const q = document.getElementById('lpr-vnd-q');
      if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    }
  }

  /* ================================================================
     EDITOR
     ================================================================ */
  function renderEditor(v) {
    const editedCount = ALL_FIELDS.filter(f =>
      v.overrides?.[f] != null && v.source[f] !== v.overrides[f]
    ).length;

    return `
      <div class="lpr-tp-ed">
        <div class="lpr-tp-ed-hd">
          <span>${esc(v.effective.name || '—')}</span>
          ${editedCount ? `<span class="lpr-tp-badge">⚠ ${editedCount} edited</span>` : ''}
        </div>
        <div class="lpr-tp-fields">
          ${ALL_FIELDS.map(f => {
            const over = v.overrides?.[f] != null && v.source[f] !== v.overrides[f];
            return `
              <div class="lpr-tp-field${over ? ' ov' : ''}">
                <label class="lpr-tp-lbl">${esc(FIELD_LABELS[f])}</label>
                <input class="lpr-tp-inp" data-field="${esc(f)}" value="${esc(v.effective[f] || '')}"/>
                ${over ? `<div class="lpr-tp-src-hint">Buildium: ${esc(v.source[f])}</div>` : ''}
              </div>`;
          }).join('')}
        </div>
        <div class="lpr-tp-foot">
          <button id="lpr-vnd-apply-rec" class="lpr-tp-apply">Apply as Recipient</button>
          <button id="lpr-vnd-apply-body" class="lpr-tp-apply-body">Body fields only</button>
        </div>
      </div>`;
  }

  function wireEditor(v) {
    const panel = document.getElementById('lpr-fill-panel');
    if (!panel) return;

    panel.querySelectorAll('.lpr-tp-inp').forEach(inp => {
      inp.onchange = e => {
        const updated = saveOverride(v._id, e.target.dataset.field, e.target.value);
        if (!updated) return;
        const fieldDiv = e.target.closest('.lpr-tp-field');
        const f        = e.target.dataset.field;
        const over     = updated.overrides?.[f] != null && updated.source[f] !== updated.overrides[f];
        fieldDiv.classList.toggle('ov', over);
        let hint = fieldDiv.querySelector('.lpr-tp-src-hint');
        if (over) {
          if (!hint) { hint = document.createElement('div'); hint.className = 'lpr-tp-src-hint'; fieldDiv.appendChild(hint); }
          hint.textContent = 'Buildium: ' + updated.source[f];
        } else hint?.remove();

        const editedCount = ALL_FIELDS.filter(f =>
          updated.overrides?.[f] != null && updated.source[f] !== updated.overrides[f]
        ).length;
        const hd = panel.querySelector('.lpr-tp-ed-hd');
        if (hd) {
          let badge = hd.querySelector('.lpr-tp-badge');
          if (editedCount) {
            if (!badge) { badge = document.createElement('span'); badge.className = 'lpr-tp-badge'; hd.appendChild(badge); }
            badge.textContent = `⚠ ${editedCount} edited`;
          } else badge?.remove();
        }
      };
    });

    const recBtn = document.getElementById('lpr-vnd-apply-rec');
    if (recBtn) recBtn.onclick = () => {
      const fresh = loadVendors()[v._id];
      if (!fresh) return;
      applyVendorAsRecipient(fresh);
      recBtn.textContent = '✓ Applied';
      recBtn.classList.add('ok');
      setTimeout(() => { recBtn.textContent = 'Apply as Recipient'; recBtn.classList.remove('ok'); }, 1800);
    };

    const bodyBtn = document.getElementById('lpr-vnd-apply-body');
    if (bodyBtn) bodyBtn.onclick = () => {
      const fresh = loadVendors()[v._id];
      if (!fresh) return;
      applyVendor(fresh);
      bodyBtn.textContent = '✓ Applied';
      bodyBtn.classList.add('ok');
      setTimeout(() => { bodyBtn.textContent = 'Body fields only'; bodyBtn.classList.remove('ok'); }, 1800);
    };
  }

  /* ================================================================
     STYLES
     ================================================================ */
  function injectStyles() {
    if (document.getElementById('lpr-vendor-css')) return;
    const s = document.createElement('style');
    s.id = 'lpr-vendor-css';
    s.textContent = `
      /* ---- Vendor field placeholders ---- */
      [data-vendor-field]:empty::before {
        content: attr(data-vendor-label);
        color: rgba(40,56,145,.28);
        font-style: italic; font-size: .9em;
        border-bottom: 1px dashed rgba(40,56,145,.22);
        pointer-events: none;
      }
      @media print { [data-vendor-field]:empty::before { display: none; } }

      .sheet.tt-editing [data-vendor-field] {
        background: rgba(40,56,145,.08);
        outline: 1px dashed rgba(40,56,145,.4);
        border-radius: 2px; padding: 0 2px;
      }
      .sheet.tt-editing [data-vendor-field]:empty::before {
        content: attr(data-vendor-label);
        color: rgba(40,56,145,.55); font-style: italic; font-size: .88em;
        border-bottom: none;
      }

      /* ---- Body-only apply button ---- */
      .lpr-tp-apply-body {
        width: 100%; padding: 7px; margin-top: 6px;
        background: none; color: #283891;
        border: 1.5px solid #283891; border-radius: 999px;
        font-family: inherit; font-size: 12px; font-weight: 600;
        cursor: pointer; transition: all .2s;
      }
      .lpr-tp-apply-body:hover { background: #283891; color: #fff; }
      .lpr-tp-apply-body.ok { background: #2a7a2a; color: #fff; border-color: #2a7a2a; }
    `;
    document.head.appendChild(s);
  }

  /* ================================================================
     INIT
     ================================================================ */
  function init() {
    injectStyles();
    labelVendorFields();
    window.LPR_FILL_TABS = window.LPR_FILL_TABS || [];
    window.LPR_FILL_TABS.push({ id: 'vendors', label: 'Vendors', render: renderVendorContent });
    window.LPR_VENDORS = { loadVendors, importCSV, applyVendor, applyVendorAsRecipient, FIELD_LABELS };
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
