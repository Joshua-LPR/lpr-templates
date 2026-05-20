/* ============================================================
   LPR Tenant Address Book  —  tenants.js
   ------------------------------------------------------------
   Two independent modes — no tabs, no extra clicks:

   EDIT MODE (triggered by the existing Edit button in template-tools.js)
     → Insert sidebar opens automatically on the right.
     → Click any field button to paste it at the cursor position.
     → Sidebar closes automatically when Done Editing is clicked.

   FILL FIELDS button (added to toolbar by this script)
     → Opens the tenant picker panel.
     → Import CSV, pick a tenant, edit fields, apply to template.
     → Completely separate from edit mode.

   3-layer data model per tenant:
     source    — raw values from last CSV import
     overrides — manual edits in the panel (never overwritten by CSV)
     effective — what fills the template (override wins; falls back to source)

   On re-import:
     • New tenant  → added fresh
     • Existing    → source updated, overrides preserved, effective recomputed
     • Override matches new source → override auto-cleared
     • Source changed but override exists → hint "Buildium: …" shown

   Template markup:
     <span data-tenant-field="first_name"></span>
     <span data-tenant-field="address_line2" data-tenant-hide-empty></span>

   Storage key: lpr_tenants  (namespaced by user.js when present)
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY  = 'lpr_tenants';
  const RECENT_KEY   = 'lpr_recent_tenants';
  const RECENT_MAX   = 5;

  /* ---- Field mapping: CSV column → internal key ---- */
  const CSV_MAP = {
    'Id':                       '_id',
    'First name':               'first_name',
    'Last name':                'last_name',
    'Start date':               'lease_start',
    'End date':                 'lease_end',
    'Rent/Fee':                 'rent_amount',
    'Street address line 1':    'address_line1',
    'Street address line 2':    'address_line2',
    'City/Locality':            'city',
    'State/Province/Territory': 'state',
    'Postal code':              'zip',
    'Login email':              'email1',
    'Alternate email':          'email2',
    'Mobile':                   'phone',
    'Date of birth':            'dob',
  };
  // phone2 derives from two CSV columns — handled separately in importCSV

  const FIELD_LABELS = {
    first_name:    'First Name',
    last_name:     'Last Name',
    address_line1: 'Street Address',
    address_line2: 'Address Line 2',
    city:          'City',
    state:         'State',
    zip:           'Zip',
    lease_start:   'Lease Start',
    lease_end:     'Lease End',
    rent_amount:   'Rent Amount',
    phone:         'Phone (Mobile)',
    phone2:        'Phone 2 (Home/Work)',
    email1:        'Email 1',
    email2:        'Email 2',
    dob:           'Date of Birth',
  };

  const ALL_FIELDS = Object.keys(FIELD_LABELS);

  /* ================================================================
     STORAGE
     ================================================================ */
  function loadTenants() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveTenants(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  function loadRecents() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function pushRecent(id) {
    const list = [id, ...loadRecents().filter(x => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  }
  function removeRecent(id) {
    localStorage.setItem(RECENT_KEY, JSON.stringify(loadRecents().filter(x => x !== id)));
  }

  /* ================================================================
     DATA HELPERS
     ================================================================ */
  function computeEffective(tenant) {
    const eff = {};
    ALL_FIELDS.forEach(f => {
      eff[f] = (tenant.overrides && tenant.overrides[f] != null)
        ? tenant.overrides[f]
        : (tenant.source[f] || '');
    });
    return eff;
  }

  function saveOverride(tenantId, field, value) {
    const data = loadTenants();
    const t = data[tenantId];
    if (!t) return null;
    if (!t.overrides) t.overrides = {};
    if (value === t.source[field]) {
      delete t.overrides[field];
    } else {
      t.overrides[field] = value;
    }
    t.effective = computeEffective(t);
    saveTenants(data);
    return data[tenantId];
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
      headers.forEach((h, j) => { row[h.trim()] = (vals[j] || '').trim(); });
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
    const data = loadTenants();
    let added = 0, updated = 0, unchanged = 0;

    rows.forEach(row => {
      const id = (row['Id'] || '').trim();
      if (!id) return;

      const source = {};
      ALL_FIELDS.forEach(f => {
        if (f === 'phone2') return;
        const col = Object.entries(CSV_MAP).find(([k, v]) => v === f && k !== 'Id')?.[0];
        source[f] = col ? (row[col] || '').trim() : '';
      });
      source['phone2'] = (row['Home phone'] || '').trim() || (row['Work phone'] || '').trim();

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

    saveTenants(data);
    return { added, updated, unchanged, total: Object.keys(data).length };
  }

  /* ================================================================
     APPLY TENANT TO PAGE
     ================================================================ */
  function applyTenant(tenant) {
    document.querySelectorAll('[data-tenant-field]').forEach(el => {
      const f = el.getAttribute('data-tenant-field');
      const val = tenant.effective[f] || '';
      el.textContent = val;
      if (el.hasAttribute('data-tenant-hide-empty')) {
        el.style.display = val ? '' : 'none';
      }
    });
  }

  /* ================================================================
     INSERT FIELD AT CURSOR
     ================================================================ */
  const CONTACT_FIELD_LABELS = {
    name:          'Recipient Name',
    address_line1: 'Street Address',
    address_line2: 'Address Line 2',
    city:          'City',
    state:         'State',
    zip:           'Zip',
    email:         'Email',
    phone:         'Phone',
  };

  function applyTenantAsRecipient(tenant) {
    applyTenant(tenant);
    const name = [tenant.effective.first_name, tenant.effective.last_name].filter(Boolean).join(' ');
    const contactMap = {
      name,
      address_line1: tenant.effective.address_line1,
      address_line2: tenant.effective.address_line2,
      city:          tenant.effective.city,
      state:         tenant.effective.state,
      zip:           tenant.effective.zip,
      email:         tenant.effective.email1,
      phone:         tenant.effective.phone,
    };
    document.querySelectorAll('[data-contact-field]').forEach(el => {
      const f = el.getAttribute('data-contact-field');
      if (f in contactMap) el.textContent = contactMap[f] || '';
    });
  }

  function insertField(key, ns) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;

    const range = sel.getRangeAt(0);
    const sheet = document.querySelector('.sheet');
    if (!sheet || !sheet.contains(range.commonAncestorContainer)) return false;

    range.deleteContents();

    const span = document.createElement('span');
    const attr  = ns === 'contact' ? 'data-contact-field'
                : ns === 'vendor'  ? 'data-vendor-field'
                : 'data-tenant-field';
    const label = ns === 'contact' ? CONTACT_FIELD_LABELS[key]
                : ns === 'vendor'  ? (window.LPR_VENDORS?.FIELD_LABELS?.[key])
                : FIELD_LABELS[key];
    span.setAttribute(attr, key);
    if (label) span.setAttribute(attr.replace('-field', '-label'), label);
    range.insertNode(span);

    const after = range.cloneRange();
    after.setStartAfter(span);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    return true;
  }

  /* ================================================================
     EDIT MODE — auto-managed insert sidebar
     ================================================================ */
  let isEditMode  = false;
  let insertPanel = null;   // separate element from the fill panel
  let autoOpened  = false;  // was insert sidebar opened by edit mode?

  function observeEditMode() {
    const sheet = document.querySelector('.sheet');
    if (!sheet) return;
    new MutationObserver(() => {
      const editing = sheet.classList.contains('tt-editing');
      if (editing === isEditMode) return;
      isEditMode = editing;
      if (editing) {
        openInsertSidebar();
      } else {
        if (autoOpened) closeInsertSidebar();
        autoOpened = false;
      }
    }).observe(sheet, { attributes: true, attributeFilter: ['class'] });
  }

  function openInsertSidebar() {
    if (insertPanel) return; // already open
    autoOpened = true;
    insertPanel = document.createElement('div');
    insertPanel.id = 'lpr-insert-panel';
    document.body.appendChild(insertPanel);
    renderInsertSidebar();
    // Shift fill panel left if both are open
    syncPanelPositions();
  }

  function closeInsertSidebar() {
    insertPanel?.remove();
    insertPanel = null;
    syncPanelPositions();
  }

  function renderInsertSidebar() {
    if (!insertPanel) return;
    const vendorLabels = window.LPR_VENDORS?.FIELD_LABELS || {};

    function insGroup(title, fields, ns) {
      return `
        <div class="lpr-ins-group-label">${title}</div>
        <div class="lpr-ins-grid">
          ${fields.map(([key, label]) => `
            <button class="lpr-ins-btn" data-field="${esc(key)}" data-ns="${ns}">${esc(label)}</button>
          `).join('')}
        </div>`;
    }

    insertPanel.innerHTML = `
      <div class="lpr-ins-hd">
        <span>Insert Field</span>
        <button class="lpr-tp-x" id="lpr-ins-x">✕</button>
      </div>
      <div class="lpr-ins-body">
        ${insGroup('RECIPIENT', Object.entries(CONTACT_FIELD_LABELS), 'contact')}
        ${insGroup('TENANT — body reference', Object.entries(FIELD_LABELS), 'tenant')}
        ${Object.keys(vendorLabels).length ? insGroup('VENDOR — body reference', Object.entries(vendorLabels), 'vendor') : ''}
        <div id="lpr-ins-hint" class="lpr-ins-hint"></div>
        <button class="lpr-ins-clear" id="lpr-ins-clear">Clear All Fields</button>
      </div>
    `;

    document.getElementById('lpr-ins-x').onclick = () => {
      autoOpened = false;
      closeInsertSidebar();
    };

    document.getElementById('lpr-ins-clear').onclick = () => {
      document.querySelectorAll('[data-tenant-field],[data-vendor-field],[data-contact-field]').forEach(el => {
        el.textContent = '';
        if (el.hasAttribute('data-tenant-hide-empty')) el.style.display = 'none';
      });
      const btn = document.getElementById('lpr-ins-clear');
      btn.textContent = '✓ Cleared';
      setTimeout(() => { btn.textContent = 'Clear All Fields'; }, 1500);
    };

    insertPanel.querySelectorAll('.lpr-ins-btn').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault(); // keep focus in contenteditable
        const ok = insertField(btn.dataset.field, btn.dataset.ns);
        if (ok) {
          btn.classList.add('inserted');
          setTimeout(() => btn.classList.remove('inserted'), 500);
        } else {
          const hint = document.getElementById('lpr-ins-hint');
          if (hint) {
            hint.textContent = 'Click inside the template first.';
            hint.style.opacity = '1';
            clearTimeout(hint._t);
            hint._t = setTimeout(() => { hint.style.opacity = '0'; }, 2500);
          }
        }
      });
    });
  }

  /* When both panels are open, offset the fill panel so they don't overlap */
  function syncPanelPositions() {
    if (!fillPanel) return;
    fillPanel.style.right = insertPanel ? '280px' : '0';
  }

  /* ================================================================
     FILL FIELDS PANEL
     ================================================================ */
  let fillPanel       = null;
  let activeTab       = 'tenants';
  let selectedId      = null;
  let searchQ         = '';
  let importMsg       = '';
  let addMode         = false;
  let _panelKeyHandler = null;

  function openFillPanel() {
    if (fillPanel) { closeFillPanel(); return; }
    fillPanel = document.createElement('div');
    fillPanel.id = 'lpr-fill-panel';
    fillPanel.style.right = insertPanel ? '280px' : '0';
    document.body.appendChild(fillPanel);
    document.getElementById('lpr-fill-btn')?.classList.add('tt-active');
    _panelKeyHandler = function (e) {
      const q = fillPanel && fillPanel.querySelector('#lpr-tp-q, #lpr-vnd-q');
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && !document.activeElement.isContentEditable) {
        if (q) { e.preventDefault(); q.focus(); }
      }
      if (e.key === 'Escape' && q && document.activeElement === q) {
        q.value = '';
        q.dispatchEvent(new Event('input')); // triggers each tab's own oninput → clears its searchQ
      }
    };
    document.addEventListener('keydown', _panelKeyHandler);
    renderFillPanel();
  }

  function closeFillPanel() {
    fillPanel?.remove();
    fillPanel = null;
    if (_panelKeyHandler) {
      document.removeEventListener('keydown', _panelKeyHandler);
      _panelKeyHandler = null;
    }
    document.getElementById('lpr-fill-btn')?.classList.remove('tt-active');
  }

  function renderFillPanel(opts) {
    if (!fillPanel) return;

    const tabs     = window.LPR_FILL_TABS || [];
    const showTabs = tabs.length > 1;

    fillPanel.innerHTML = `
      <div class="lpr-tp-hd">
        <span>Setup</span>
        <button class="lpr-tp-x" id="lpr-fill-x">✕</button>
      </div>
      ${showTabs ? `
      <div class="lpr-tp-tab-bar">
        ${tabs.map(t => `<button class="lpr-tp-tab-btn${t.id === activeTab ? ' active' : ''}" data-tab="${esc(t.id)}">${esc(t.label)}</button>`).join('')}
      </div>` : ''}
      <div id="lpr-tab-body" class="lpr-tab-body"></div>
    `;

    gid('lpr-fill-x').onclick = closeFillPanel;

    if (showTabs) {
      fillPanel.querySelectorAll('.lpr-tp-tab-btn').forEach(btn => {
        btn.onclick = () => { activeTab = btn.dataset.tab; renderFillPanel(); };
      });
    }

    const body = gid('lpr-tab-body');
    const tab  = tabs.find(t => t.id === activeTab) || tabs[0];
    if (tab) tab.render(body, opts);
  }

  function renderTenantContent(container, opts) {
    const data        = loadTenants();
    const all         = Object.values(data);
    const named       = all.filter(t => t.effective.first_name || t.effective.last_name);
    const q           = searchQ.toLowerCase();
    const recentItems = q ? [] : loadRecents().map(id => data[id]).filter(Boolean);
    const filtered    = named
      .filter(t => !q || [
        t.effective.first_name, t.effective.last_name,
        t.effective.address_line1, t.effective.city
      ].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (a.effective.last_name || '').localeCompare(b.effective.last_name || ''));

    const sel = selectedId ? data[selectedId] : null;

    container.innerHTML = `
      <div class="lpr-tp-import-row">
        <label class="lpr-tp-import-btn">
          <input type="file" accept=".csv" id="lpr-tp-file" hidden/>
          ↑ Import CSV
        </label>
        <button class="lpr-tp-add-btn" id="lpr-tp-add">+ Add</button>
        <span class="lpr-tp-count">${named.length} tenant${named.length !== 1 ? 's' : ''}</span>
      </div>
      ${importMsg ? `<div class="lpr-tp-msg">${esc(importMsg)}</div>` : ''}

      <div class="lpr-tp-search-wrap">
        <input id="lpr-tp-q" class="lpr-tp-q" type="text"
               placeholder="Search…" value="${esc(searchQ)}"/>
      </div>

      ${recentItems.length ? `
        <div class="lpr-tp-recent">
          <div class="lpr-tp-sec-hd">Recent</div>
          ${recentItems.map(t => `
            <div class="lpr-tp-item${t._id === selectedId ? ' sel' : ''}" data-id="${esc(t._id)}">
              <div class="lpr-tp-name">${esc(t.effective.last_name)}, ${esc(t.effective.first_name)}</div>
              <div class="lpr-tp-addr">${esc(t.effective.address_line1)}${t.effective.city ? ' · ' + esc(t.effective.city) : ''}</div>
              <button class="lpr-tp-recent-rm" data-id="${esc(t._id)}" title="Remove">✕</button>
            </div>`).join('')}
        </div>
      ` : ''}

      <div class="lpr-tp-list">
        ${filtered.length === 0
          ? `<div class="lpr-tp-empty">${all.length === 0 ? 'Import a CSV to get started' : 'No matches'}</div>`
          : filtered.map(t => `
              <div class="lpr-tp-item${t._id === selectedId ? ' sel' : ''}" data-id="${esc(t._id)}">
                <div class="lpr-tp-name">${esc(t.effective.last_name)}, ${esc(t.effective.first_name)}</div>
                <div class="lpr-tp-addr">${esc(t.effective.address_line1)}${t.effective.city ? ' · ' + esc(t.effective.city) : ''}</div>
              </div>`).join('')}
      </div>

      ${addMode ? renderAddForm() : sel ? renderEditor(sel) : `<div class="lpr-tp-no-sel">← Select a tenant above</div>`}
    `;

    gid('lpr-tp-file').onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const res = importCSV(ev.target.result);
        importMsg = `✓ ${res.added} added · ${res.updated} updated · ${res.unchanged} unchanged`;
        renderFillPanel();
      };
      reader.readAsText(file);
    };

    gid('lpr-tp-add').onclick = () => {
      addMode = true;
      selectedId = null;
      searchQ = '';
      importMsg = '';
      renderFillPanel();
    };

    gid('lpr-tp-q').oninput = e => {
      searchQ = e.target.value;
      renderFillPanel({ refocus: true });
    };

    fillPanel.querySelectorAll('.lpr-tp-item').forEach(el => {
      el.onclick = () => { selectedId = el.dataset.id; addMode = false; importMsg = ''; renderFillPanel(); };
    });

    fillPanel.querySelectorAll('.lpr-tp-recent-rm').forEach(btn => {
      btn.onclick = e => { e.stopPropagation(); removeRecent(btn.dataset.id); renderFillPanel(); };
    });

    if (sel) wireEditor(sel);
    if (addMode) wireAddForm();
    if (opts?.refocus) {
      const q = gid('lpr-tp-q');
      if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    }
  }

  /* ================================================================
     TENANT EDITOR
     ================================================================ */
  function renderEditor(t) {
    const editedCount = ALL_FIELDS.filter(f =>
      t.overrides?.[f] != null && t.source[f] !== t.overrides[f]
    ).length;

    return `
      <div class="lpr-tp-ed">
        <div class="lpr-tp-ed-hd">
          <span>${esc(t.effective.first_name)} ${esc(t.effective.last_name)}</span>
          ${editedCount ? `<span class="lpr-tp-badge">⚠ ${editedCount} edited</span>` : ''}
          ${t._manual ? `<button class="lpr-tp-del-btn" id="lpr-tp-del" title="Delete tenant">Delete</button>` : ''}
        </div>
        <div class="lpr-tp-fields">
          ${ALL_FIELDS.map(f => {
            const over = t.overrides?.[f] != null && t.source[f] !== t.overrides[f];
            return `
              <div class="lpr-tp-field${over ? ' ov' : ''}">
                <label class="lpr-tp-lbl">${esc(FIELD_LABELS[f])}</label>
                <input class="lpr-tp-inp" data-field="${esc(f)}" value="${esc(t.effective[f] || '')}"/>
                ${over ? `<div class="lpr-tp-src-hint">Buildium: ${esc(t.source[f])}</div>` : ''}
              </div>`;
          }).join('')}
        </div>
        <div class="lpr-tp-foot">
          <button id="lpr-tp-apply-rec" class="lpr-tp-apply">Apply as Recipient</button>
          <button id="lpr-tp-apply-body" class="lpr-tp-apply-body">Body fields only</button>
        </div>
      </div>`;
  }

  function wireEditor(t) {
    fillPanel.querySelectorAll('.lpr-tp-inp').forEach(inp => {
      inp.onchange = e => {
        const updated = saveOverride(t._id, e.target.dataset.field, e.target.value);
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
        const hd = fillPanel.querySelector('.lpr-tp-ed-hd');
        if (hd) {
          let badge = hd.querySelector('.lpr-tp-badge');
          if (editedCount) {
            if (!badge) { badge = document.createElement('span'); badge.className = 'lpr-tp-badge'; hd.appendChild(badge); }
            badge.textContent = `⚠ ${editedCount} edited`;
          } else badge?.remove();
        }
      };
    });

    gid('lpr-tp-apply-rec').onclick = () => {
      const fresh = loadTenants()[t._id];
      if (!fresh) return;
      applyTenantAsRecipient(fresh);
      pushRecent(t._id);
      const btn = gid('lpr-tp-apply-rec');
      btn.textContent = '✓ Applied';
      btn.classList.add('ok');
      setTimeout(() => { btn.textContent = 'Apply as Recipient'; btn.classList.remove('ok'); }, 1800);
    };

    gid('lpr-tp-apply-body').onclick = () => {
      const fresh = loadTenants()[t._id];
      if (!fresh) return;
      applyTenant(fresh);
      pushRecent(t._id);
      const btn = gid('lpr-tp-apply-body');
      btn.textContent = '✓ Applied';
      btn.classList.add('ok');
      setTimeout(() => { btn.textContent = 'Body fields only'; btn.classList.remove('ok'); }, 1800);
    };

    const delBtn = gid('lpr-tp-del');
    if (delBtn) delBtn.onclick = () => {
      if (!confirm('Delete this tenant?')) return;
      const data = loadTenants();
      delete data[t._id];
      saveTenants(data);
      removeRecent(t._id);
      selectedId = null;
      importMsg = '';
      renderFillPanel();
    };
  }

  function renderAddForm() {
    return `
      <div class="lpr-tp-ed">
        <div class="lpr-tp-ed-hd">
          <span>New Tenant</span>
        </div>
        <div class="lpr-tp-fields">
          ${ALL_FIELDS.map(f => `
            <div class="lpr-tp-field">
              <label class="lpr-tp-lbl">${esc(FIELD_LABELS[f])}</label>
              <input class="lpr-tp-inp lpr-tp-new-inp" data-field="${esc(f)}" value="" placeholder="${esc(FIELD_LABELS[f])}"/>
            </div>`).join('')}
        </div>
        <div class="lpr-tp-foot">
          <button id="lpr-tp-new-save" class="lpr-tp-apply">Save Tenant</button>
          <button id="lpr-tp-new-cancel" class="lpr-tp-apply-body">Cancel</button>
        </div>
      </div>`;
  }

  function wireAddForm() {
    gid('lpr-tp-new-cancel').onclick = () => {
      addMode = false;
      renderFillPanel();
    };
    gid('lpr-tp-new-save').onclick = () => {
      const source = {};
      fillPanel.querySelectorAll('.lpr-tp-new-inp').forEach(inp => {
        source[inp.dataset.field] = inp.value.trim();
      });
      const id = 'm_' + Date.now();
      const data = loadTenants();
      data[id] = { _id: id, _manual: true, source, overrides: {}, effective: { ...source } };
      saveTenants(data);
      addMode = false;
      selectedId = id;
      importMsg = '✓ Tenant added';
      renderFillPanel();
    };
  }

  /* ================================================================
     LABEL FIELDS — sets data-tenant-label for placeholder display
     ================================================================ */
  function labelFields() {
    document.querySelectorAll('[data-tenant-field]').forEach(el => {
      const key = el.getAttribute('data-tenant-field');
      if (FIELD_LABELS[key]) el.setAttribute('data-tenant-label', FIELD_LABELS[key]);
    });
    document.querySelectorAll('[data-contact-field]').forEach(el => {
      const key = el.getAttribute('data-contact-field');
      if (CONTACT_FIELD_LABELS[key]) el.setAttribute('data-contact-label', CONTACT_FIELD_LABELS[key]);
    });
  }

  /* ================================================================
     INIT
     ================================================================ */
  function init() {
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;
    injectStyles();
    labelFields();
    window.LPR_FILL_TABS = window.LPR_FILL_TABS || [];
    window.LPR_FILL_TABS.unshift({ id: 'tenants', label: 'Tenants', render: renderTenantContent });

    const btn = document.createElement('button');
    btn.id          = 'lpr-fill-btn';
    btn.className   = 'tt-btn';
    btn.textContent = 'Setup';
    btn.addEventListener('click', openFillPanel);

    const firstBtn = toolbar.querySelector('button');
    firstBtn ? toolbar.insertBefore(btn, firstBtn) : toolbar.appendChild(btn);

    observeEditMode();
  }

  /* ================================================================
     HELPERS
     ================================================================ */
  function gid(s) { return document.getElementById(s); }
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ================================================================
     STYLES
     ================================================================ */
  function injectStyles() {
    if (gid('lpr-tenant-css')) return;
    const s = document.createElement('style');
    s.id = 'lpr-tenant-css';
    s.textContent = `
      /* ---- Tab bar ---- */
      .lpr-tp-tab-bar {
        display: flex; border-bottom: 2px solid #eee; flex-shrink: 0;
      }
      .lpr-tp-tab-btn {
        flex: 1; padding: 8px 4px; background: none; border: none;
        border-bottom: 2px solid transparent; margin-bottom: -2px;
        font-family: inherit; font-size: 11px; font-weight: 600;
        color: #aaa; cursor: pointer; letter-spacing: .5px;
        text-transform: uppercase; text-align: center;
        transition: color .15s, border-color .15s;
      }
      .lpr-tp-tab-btn:hover { color: #283891; }
      .lpr-tp-tab-btn.active { color: #283891; border-bottom-color: #283891; }
      .lpr-tab-body {
        display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden;
      }

      /* ---- Shared panel base ---- */
      #lpr-insert-panel, #lpr-fill-panel {
        position: fixed; top: 0; bottom: 0; width: 272px;
        background: #fff; z-index: 9000;
        display: flex; flex-direction: column;
        font-family: 'Montserrat', sans-serif; font-size: 13px; overflow: hidden;
      }
      #lpr-insert-panel {
        right: 0;
        box-shadow: -4px 0 24px rgba(0,0,0,.13);
        transition: right .2s;
      }
      #lpr-fill-panel {
        box-shadow: -4px 0 24px rgba(0,0,0,.13);
        transition: right .2s;
      }

      /* ---- Insert sidebar header ---- */
      .lpr-ins-hd {
        display: flex; align-items: center; justify-content: space-between;
        padding: 70px 12px 13px 16px; background: #283891;
        color: #fff; font-weight: 700; font-size: 13px;
        letter-spacing: .4px; flex-shrink: 0;
      }

      /* ---- Fill panel header ---- */
      .lpr-tp-hd {
        display: flex; align-items: center; justify-content: space-between;
        padding: 70px 12px 13px 16px; background: #283891;
        color: #fff; font-weight: 700; font-size: 13px;
        letter-spacing: .4px; flex-shrink: 0;
      }

      .lpr-tp-x {
        background: none; border: none; color: rgba(255,255,255,.7);
        font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 4px; line-height: 1;
      }
      .lpr-tp-x:hover { color: #fff; background: rgba(255,255,255,.15); }

      /* ---- Insert body ---- */
      .lpr-ins-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
      .lpr-ins-tip { font-size: 11.5px; color: #283891; background: #eef0fb; border-radius: 6px; padding: 9px 11px; line-height: 1.6; margin: 0; }
      .lpr-ins-grid { display: flex; flex-direction: column; gap: 4px; }
      .lpr-ins-btn {
        width: 100%; text-align: left; padding: 8px 12px;
        background: #f4f5fb; border: 1px solid #dde0f5; border-radius: 6px;
        font-family: inherit; font-size: 12px; font-weight: 500;
        color: #283891; cursor: pointer; transition: background .12s;
        user-select: none;
      }
      .lpr-ins-btn:hover { background: #283891; color: #fff; border-color: #283891; }
      .lpr-ins-btn.inserted { background: #2a7a2a; color: #fff; border-color: #2a7a2a; }
      .lpr-ins-hint { font-size: 11px; color: #c04; min-height: 16px; opacity: 0; transition: opacity .3s; }
      .lpr-ins-clear { width: 100%; margin-top: 4px; padding: 8px; background: none; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 12px; color: #888; cursor: pointer; transition: all .15s; }
      .lpr-ins-clear:hover { border-color: #c04; color: #c04; }

      /* ---- Fill panel elements ---- */
      .lpr-tp-import-row {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 14px; border-bottom: 1px solid #eee; flex-shrink: 0;
      }
      .lpr-tp-import-btn {
        background: #283891; color: #fff; font-family: inherit; font-size: 11px;
        font-weight: 600; padding: 6px 13px; border-radius: 999px;
        cursor: pointer; white-space: nowrap; transition: background .15s; user-select: none;
      }
      .lpr-tp-import-btn:hover { background: #1c2870; }
      .lpr-tp-count { font-size: 11px; color: #999; }
      .lpr-tp-msg { padding: 4px 14px 2px; font-size: 11px; color: #2a7a2a; flex-shrink: 0; }

      .lpr-tp-search-wrap { padding: 8px 14px; flex-shrink: 0; }
      .lpr-tp-q {
        width: 100%; box-sizing: border-box; padding: 7px 10px;
        border: 1px solid #ddd; border-radius: 6px;
        font-family: inherit; font-size: 12px; outline: none;
      }
      .lpr-tp-q:focus { border-color: #283891; }

      .lpr-tp-list { flex: 0 0 auto; max-height: 200px; overflow-y: auto; border-bottom: 1px solid #eee; }
      .lpr-tp-empty, .lpr-tp-no-sel { padding: 16px; text-align: center; color: #bbb; font-size: 12px; }
      .lpr-tp-item { padding: 8px 14px; cursor: pointer; border-bottom: 1px solid #f2f2f2; transition: background .1s; }
      .lpr-tp-item:hover { background: #f7f8ff; }
      .lpr-tp-item.sel { background: #eef0fb; border-left: 3px solid #283891; padding-left: 11px; }
      .lpr-tp-name { font-weight: 600; font-size: 12.5px; color: #0e1430; }
      .lpr-tp-addr { font-size: 11px; color: #999; margin-top: 2px; }

      .lpr-tp-ed { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
      .lpr-tp-ed-hd { display: flex; align-items: center; gap: 8px; padding: 9px 14px; font-weight: 700; font-size: 12.5px; background: #f7f8ff; border-bottom: 1px solid #eee; flex-shrink: 0; }
      .lpr-tp-badge { font-size: 10px; font-weight: 600; color: #b07800; background: #fff8e1; border: 1px solid #ffe082; padding: 2px 7px; border-radius: 999px; white-space: nowrap; }
      .lpr-tp-fields { flex: 1; overflow-y: auto; padding: 8px 14px; }
      .lpr-tp-field { margin-bottom: 9px; }
      .lpr-tp-lbl { display: block; font-size: 10px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; color: #aaa; margin-bottom: 3px; }
      .lpr-tp-inp { width: 100%; box-sizing: border-box; padding: 6px 9px; border: 1px solid #ddd; border-radius: 5px; font-family: inherit; font-size: 12.5px; color: #0e1430; outline: none; }
      .lpr-tp-inp:focus { border-color: #283891; }
      .lpr-tp-field.ov .lpr-tp-inp { border-color: #f5c518; background: #fffef5; }
      .lpr-tp-src-hint { font-size: 10px; color: #b07800; margin-top: 2px; padding-left: 2px; }
      .lpr-tp-foot { padding: 11px 14px; border-top: 1px solid #eee; flex-shrink: 0; }
      .lpr-tp-apply { width: 100%; padding: 10px; background: #283891; color: #fff; border: none; border-radius: 999px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .2s; }
      .lpr-tp-apply:hover { background: #1c2870; }
      .lpr-tp-apply.ok { background: #2a7a2a; }

      /* ---- Recent section ---- */
      .lpr-tp-recent {
        flex-shrink: 0; background: #f7f8ff;
        border-bottom: 2px solid #dde0f5;
      }
      .lpr-tp-sec-hd {
        padding: 5px 14px 3px;
        font-size: 9.5px; font-weight: 700; letter-spacing: 1px;
        text-transform: uppercase; color: #283891;
      }
      .lpr-tp-recent .lpr-tp-item { background: #f7f8ff; position: relative; padding-right: 30px; }
      .lpr-tp-recent .lpr-tp-item:hover { background: #eef0fb; }
      .lpr-tp-recent-rm {
        position: absolute; right: 7px; top: 50%; transform: translateY(-50%);
        background: none; border: none; color: #ccc; font-size: 10px;
        cursor: pointer; padding: 3px 5px; border-radius: 3px; line-height: 1;
        transition: color .15s;
      }
      .lpr-tp-recent-rm:hover { color: #c04; }

      /* ---- Add / delete buttons ---- */
      .lpr-tp-add-btn {
        background: none; border: 1.5px solid #283891; border-radius: 999px;
        color: #283891; font-family: inherit; font-size: 11px; font-weight: 600;
        padding: 4px 10px; cursor: pointer; white-space: nowrap; transition: all .15s;
      }
      .lpr-tp-add-btn:hover { background: #283891; color: #fff; }
      .lpr-tp-del-btn {
        margin-left: auto; padding: 3px 9px; background: none;
        border: 1px solid #e0b0b0; border-radius: 5px;
        color: #b03020; font-family: inherit; font-size: 10px;
        font-weight: 600; cursor: pointer; transition: all .15s; white-space: nowrap;
      }
      .lpr-tp-del-btn:hover { background: #ffeaea; border-color: #c03030; }

      /* ---- Insert sidebar group labels ---- */
      .lpr-ins-group-label {
        font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px;
        text-transform: uppercase; color: #283891;
        padding: 10px 0 4px; margin-top: 4px;
        border-top: 1px solid #eee;
      }
      .lpr-ins-group-label:first-child { border-top: none; margin-top: 0; padding-top: 0; }

      /* ---- Body-only apply button (tenant panel) ---- */
      .lpr-tp-apply-body {
        width: 100%; padding: 7px; margin-top: 6px;
        background: none; color: #283891;
        border: 1.5px solid #283891; border-radius: 999px;
        font-family: inherit; font-size: 12px; font-weight: 600;
        cursor: pointer; transition: all .2s;
      }
      .lpr-tp-apply-body:hover { background: #283891; color: #fff; }
      .lpr-tp-apply-body.ok { background: #2a7a2a; color: #fff; border-color: #2a7a2a; }

      /* ---- Contact-field placeholders ---- */
      [data-contact-field]:empty::before {
        content: attr(data-contact-label);
        color: rgba(40,56,145,.28);
        font-style: italic; font-size: .9em;
        border-bottom: 1px dashed rgba(40,56,145,.22);
        pointer-events: none;
      }
      @media print { [data-contact-field]:empty::before { display: none; } }
      .sheet.tt-editing [data-contact-field] {
        background: rgba(40,56,145,.08);
        outline: 1px dashed rgba(40,56,145,.4);
        border-radius: 2px; padding: 0 2px;
      }
      .sheet.tt-editing [data-contact-field]:empty::before {
        content: attr(data-contact-label);
        color: rgba(40,56,145,.55); font-style: italic; font-size: .88em;
        border-bottom: none;
      }

      /* ---- Normal-view placeholder (subtle, non-editing) ---- */
      [data-tenant-field]:empty::before {
        content: attr(data-tenant-label);
        color: rgba(40,56,145,.28);
        font-style: italic; font-size: .9em;
        border-bottom: 1px dashed rgba(40,56,145,.22);
        pointer-events: none;
      }
      @media print {
        [data-tenant-field]:empty::before { display: none; }
      }

      /* ---- Edit-mode field highlights in the sheet ---- */
      .sheet.tt-editing [data-tenant-field] {
        background: rgba(40,56,145,.08);
        outline: 1px dashed rgba(40,56,145,.4);
        border-radius: 2px; padding: 0 2px;
      }
      .sheet.tt-editing [data-tenant-field]:empty::before {
        content: attr(data-tenant-label);
        color: rgba(40,56,145,.55); font-style: italic; font-size: .88em;
        border-bottom: none;
      }
    `;
    document.head.appendChild(s);
  }

  /* ================================================================
     BOOT
     ================================================================ */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.LPR_TENANTS = { loadTenants, importCSV, applyTenant, applyTenantAsRecipient, insertField };
})();
