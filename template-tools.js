/* ============================================================
   LPR Template Tools
   Adds Edit, Export (PDF/PNG/HTML), and Save As to any template.
   ============================================================ */
(function () {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) return;

    // Normalize title: replace em/en dash with plain hyphen so Print → PDF filenames are clean
    document.title = document.title.replace(/\s*[—–]\s*/g, ' - ');

    // --- Track 4 §8 (D5/M3c): canonical .toolbar contract -------------------
    // Buttons this file appends below always land in this fixed relative
    // order, never reordered per-template:
    //   Edit · Export ▾ · Save As · Save Edits (view.html only) ·
    //   format bar (edit-mode only, appended last, hidden until editing)
    // The back link (class="toolbar-back") is authored in template markup,
    // ahead of all of these. Other shared-script UI (e.g. tenants.js's Setup
    // button) may also land in .toolbar via its own earlier-registered
    // DOMContentLoaded listener — that's outside this file's ownership.
    // What IS owned here: template-specific controls (mode-bar, P-touch
    // Font/Bold, Yard Sign design/QR toggles, calibration sliders, etc.)
    // must never be hand-added to .toolbar — they belong in .stage, above
    // the sheet. (Existing violations found during the P0e audit: Address
    // Labels P-touch.html's Font/Bold buttons — flagged for the template's
    // own migration package, not fixed here since this file only builds
    // the toolbar, it doesn't own individual template markup.)

    // EDIT toggle
    const editBtn = mkBtn("Edit", toggleEdit);
    editBtn.id = "tt-edit-btn";
    toolbar.appendChild(editBtn);

    // EXPORT dropdown — suppressed when body has data-no-export
    if (document.body.dataset.noExport !== undefined) {
      // template handles its own download (e.g. .lbt) — skip the export menu
    } else {
    const wrap = document.createElement("div");
    wrap.className = "tt-export-wrap";
    wrap.innerHTML = `
      <button class="tt-btn" id="tt-export-btn">Export <span class="tt-caret">▾</span></button>
      <div class="tt-export-menu" hidden>
        <button class="tt-menu-item" data-export="print">Print</button>
        <button class="tt-menu-item" data-export="print-blank">Print Blank</button>
        <button class="tt-menu-item" data-export="pdf">PDF (.pdf)</button>
        <button class="tt-menu-item" data-export="png">Image (.png)</button>
        <button class="tt-menu-item" data-export="html">HTML (.html)</button>
      </div>
    `;
    toolbar.appendChild(wrap);
    const expBtn = wrap.querySelector("#tt-export-btn");
    const expMenu = wrap.querySelector(".tt-export-menu");
    expBtn.addEventListener("click", e => {
      e.stopPropagation();
      expMenu.hidden = !expMenu.hidden;
    });
    wrap.querySelectorAll(".tt-menu-item").forEach(b => {
      b.addEventListener("click", async () => {
        expMenu.hidden = true;
        await exitEditModeForAction(); // exit edit mode (with lost-field safety check) before exporting
        if (b.dataset.export === "print-blank") { printBlank(); return; }
        doExport(b.dataset.export);
      });
    });
    document.addEventListener("click", e => {
      if (!wrap.contains(e.target)) expMenu.hidden = true;
    });
    } // end export dropdown block

    // SAVE AS (always present)
    const saveBtn = mkBtn("Save As", saveAs);
    saveBtn.title = "Save this filled-in template to your library";
    toolbar.appendChild(saveBtn);

    // SAVE EDITS — only when viewing an existing library entry via view.html
    const libId = (location.pathname.split('/').pop() === 'view.html')
      ? new URLSearchParams(location.search).get('id') || null
      : null;
    if (libId) {
      const saveEditsBtn = mkBtn("Save Edits", () => doSaveEdits(libId));
      saveEditsBtn.id = "tt-save-edits-btn";
      saveEditsBtn.title = "Overwrite this library entry with your current edits";
      toolbar.appendChild(saveEditsBtn);
    }

    // FORMAT BAR — visible only in edit mode
    const fmtBar = document.createElement("div");
    fmtBar.id = "tt-fmt-bar";
    fmtBar.style.display = "none";
    fmtBar.innerHTML = `
      <span class="tt-fmt-sep"></span>
      <button class="tt-btn tt-fmt-btn" data-cmd="undo" title="Undo (Ctrl+Z)">↺ Undo</button>
      <button class="tt-btn tt-fmt-btn" data-cmd="redo" title="Redo (Ctrl+Y)">↻</button>
      <span class="tt-fmt-sep"></span>
      <button class="tt-btn tt-fmt-btn" data-cmd="bold" title="Bold"><b>B</b></button>
      <button class="tt-btn tt-fmt-btn" data-cmd="italic" title="Italic"><i>I</i></button>
      <button class="tt-btn tt-fmt-btn" data-cmd="removeFormat" title="Plain — remove all formatting">Plain</button>
      <span class="tt-fmt-sep"></span>
      <select id="tt-font-size" class="tt-size-select" title="Change font size of selected text">
        <option value="">Size</option>
        <option value="7">7pt</option>
        <option value="8">8pt</option>
        <option value="9">9pt</option>
        <option value="10">10pt</option>
        <option value="11">11pt</option>
        <option value="12">12pt</option>
        <option value="14">14pt</option>
        <option value="16">16pt</option>
        <option value="18">18pt</option>
        <option value="20">20pt</option>
        <option value="24">24pt</option>
        <option value="28">28pt</option>
        <option value="32">32pt</option>
        <option value="36">36pt</option>
      </select>
      <div id="tt-color-wrap" class="tt-color-wrap" title="Text color">
        <span class="tt-color-preview" id="tt-color-preview"></span>
        <span class="tt-color-label">Color</span>
        <div class="tt-color-menu" id="tt-color-menu" hidden>
          <button class="tt-color-chip" data-color="#283891" title="Royal Blue" style="background:#283891;"></button>
          <button class="tt-color-chip" data-color="#d6a35a" title="Gold Bronze" style="background:#d6a35a;"></button>
          <button class="tt-color-chip" data-color="#0e1430" title="Ink" style="background:#0e1430;"></button>
          <button class="tt-color-chip" data-color="#1a1a1a" title="Body Text" style="background:#1a1a1a;"></button>
          <button class="tt-color-chip" data-color="#5a5f72" title="Muted" style="background:#5a5f72;"></button>
          <button class="tt-color-chip" data-color="#cc2222" title="Red" style="background:#cc2222;"></button>
          <button class="tt-color-chip tt-color-chip-clear" data-color="" title="Remove color" style="background:#fff;">⊘</button>
        </div>
      </div>
    `;
    toolbar.appendChild(fmtBar);
    fmtBar.querySelectorAll(".tt-fmt-btn").forEach(btn => {
      btn.addEventListener("mousedown", e => {
        e.preventDefault(); // preserve the text selection
        const cmd = btn.dataset.cmd;
        if (cmd === "undo") undoOnce();
        else if (cmd === "redo") redoOnce();
        else document.execCommand(cmd, false, null);
      });
    });

    // Font size — track last non-collapsed selection while editing so the
    // dropdown open doesn't lose it, then restore + apply on change.
    let _savedSizeRange = null;
    document.addEventListener("selectionchange", () => {
      if (!editing) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) return;
      const range = sel.getRangeAt(0);
      const sheet = document.querySelector(".sheet");
      if (sheet && sheet.contains(range.commonAncestorContainer)) {
        _savedSizeRange = range.cloneRange();
      }
    });
    const sizeSelect = document.getElementById("tt-font-size");
    sizeSelect.addEventListener("mousedown", () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
        _savedSizeRange = sel.getRangeAt(0).cloneRange();
      }
    });
    sizeSelect.addEventListener("change", function () {
      const pt = this.value;
      this.value = ""; // reset immediately so it reads "Size" again
      if (!pt || !_savedSizeRange) return;
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(_savedSizeRange.cloneRange());
      applyFontSize(pt);
      _savedSizeRange = null;
    });

    // Color picker — same saved-selection pattern as font size
    let _savedColorRange = null;
    document.addEventListener("selectionchange", () => {
      if (!editing) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) return;
      const range = sel.getRangeAt(0);
      const sheet = document.querySelector(".sheet");
      if (sheet && sheet.contains(range.commonAncestorContainer)) {
        _savedColorRange = range.cloneRange();
        // Keep both in sync — one selectionchange listener, two consumers
        _savedSizeRange = _savedColorRange;
      }
    });

    const colorWrap = document.getElementById("tt-color-wrap");
    const colorMenu = document.getElementById("tt-color-menu");
    const colorPreview = document.getElementById("tt-color-preview");

    colorWrap.addEventListener("mousedown", e => {
      if (e.target.closest(".tt-color-menu")) return;
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
        _savedColorRange = sel.getRangeAt(0).cloneRange();
      }
      colorMenu.hidden = !colorMenu.hidden;
    });

    colorMenu.querySelectorAll(".tt-color-chip").forEach(chip => {
      chip.addEventListener("mousedown", e => {
        e.preventDefault();
        e.stopPropagation();
        const color = chip.dataset.color;
        colorMenu.hidden = true;
        if (!_savedColorRange) return;
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(_savedColorRange.cloneRange());
        if (color) {
          applyTextColor(color);
          colorPreview.style.background = color;
          colorPreview.style.display = "inline-block";
        } else {
          document.execCommand("removeFormat", false, null);
          colorPreview.style.display = "none";
        }
        _savedColorRange = null;
      });
    });

    document.addEventListener("click", e => {
      if (!colorWrap.contains(e.target)) colorMenu.hidden = true;
    });
    // Close edit mode if user triggers browser print shortcut (Ctrl+P) while editing
    window.addEventListener("beforeprint", () => { if (editing) toggleEdit(); });

    // In edit mode, clicking a token span selects the whole token so a
    // single Backspace/Delete removes it atomically (a native, undoable
    // edit). A drag that produced a real text selection is left alone.
    document.addEventListener("click", e => {
      if (!editing) return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) return;
      const tok = e.target.closest(TOKEN_ATTRS.map(a => "[" + a + "]").join(","));
      if (!tok || !tok.closest(".sheet.tt-editing")) return;
      const range = document.createRange();
      range.selectNode(tok);
      sel.removeAllRanges();
      sel.addRange(range);
    });

    setupEditTracking();
    injectModalStyles();
  }

  function mkBtn(label, onClick) {
    const b = document.createElement("button");
    b.className = "tt-btn";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  /* --------- EDIT MODE --------- */
  let editing = false;

  // Per-sheet snapshot (full HTML + token-span census) captured when edit
  // mode turns on, so we can detect fill-in spans that got unwrapped by
  // in-place typing and, if the user chooses, undo back to it.
  let editSnapshots = [];

  const TOKEN_ATTRS = [
    'data-fill-field', 'data-tenant-field', 'data-contact-field',
    'data-employee-field', 'data-owner-field', 'data-vendor-field'
  ];
  const TOKEN_ATTR_LABELS = {
    'data-fill-field': 'Fill', 'data-tenant-field': 'Tenant', 'data-contact-field': 'Contact',
    'data-employee-field': 'Employee', 'data-owner-field': 'Owner', 'data-vendor-field': 'Vendor'
  };

  function censusTokenSpans(sheet) {
    const list = [];
    TOKEN_ATTRS.forEach(attr => {
      sheet.querySelectorAll('[' + attr + ']').forEach(el => {
        const value = el.getAttribute(attr) || '';
        list.push({
          attr: attr,
          value: value,
          label: (TOKEN_ATTR_LABELS[attr] || attr) + ' — ' + value.replace(/_/g, ' ')
        });
      });
    });
    return list;
  }

  // Multiset diff — returns the label of every token span present in
  // `before` that has no surviving counterpart in `after`.
  function diffLostSpans(before, after) {
    const beforeCounts = new Map(), afterCounts = new Map();
    before.forEach(item => { const k = item.attr + '|' + item.value; beforeCounts.set(k, (beforeCounts.get(k) || 0) + 1); });
    after.forEach(item => { const k = item.attr + '|' + item.value; afterCounts.set(k, (afterCounts.get(k) || 0) + 1); });
    const lost = [];
    beforeCounts.forEach((count, key) => {
      const remaining = afterCounts.get(key) || 0;
      if (remaining < count) {
        const sample = before.find(b => (b.attr + '|' + b.value) === key);
        for (let i = 0; i < count - remaining; i++) lost.push(sample.label);
      }
    });
    return lost;
  }

  /* --------- TOKEN-AWARE UNDO ---------
     Insert-Field tokens are placed with range.insertNode(), which the
     browser's native undo stack cannot see. We keep a parallel action log:
     token inserts are recorded here, plain typing is recorded as 'native'
     markers (coalesced per typing run, mirroring how the browser groups
     keystrokes). Ctrl+Z / the Undo button walk the log — a token on top is
     removed directly, anything else falls through to execCommand('undo'). */
  let editLog = [];   // { type:'token', el } | { type:'native', it }
  let editRedo = [];  // { type:'token', el, parent, next } | { type:'native' }
  let _sawHistory = false;

  function noteTokenInsert(el) {
    if (!editing) return;
    editLog.push({ type: "token", el: el });
    editRedo = [];
  }
  window.LPR_EDIT_UNDO = { noteTokenInsert: noteTokenInsert };

  document.addEventListener("input", e => {
    if (!editing) return;
    const host = e.target;
    if (!(host instanceof Element) || !host.closest(".sheet")) return;
    const it = e.inputType || "";
    if (it === "historyUndo") {
      _sawHistory = true;
      for (let i = editLog.length - 1; i >= 0; i--) {
        if (editLog[i].type === "native") { editLog.splice(i, 1); break; }
      }
      editRedo.push({ type: "native" });
    } else if (it === "historyRedo") {
      _sawHistory = true;
      editLog.push({ type: "native", it: "" });
    } else {
      // Coalesce a typing run into one entry, like the native stack does
      const prev = editLog[editLog.length - 1];
      const runs = it === "insertText" || it === "deleteContentBackward" || it === "deleteContentForward";
      if (!(runs && prev && prev.type === "native" && prev.it === it)) {
        editLog.push({ type: "native", it: it });
      }
      editRedo = [];
    }
  }, true);

  function _dropDetachedTokens() {
    while (editLog.length) {
      const top = editLog[editLog.length - 1];
      if (top.type === "token" && !document.contains(top.el)) editLog.pop();
      else break;
    }
  }

  function undoOnce() {
    _dropDetachedTokens();
    const top = editLog[editLog.length - 1];
    if (top && top.type === "token") {
      editLog.pop();
      editRedo.push({ type: "token", el: top.el, parent: top.el.parentNode, next: top.el.nextSibling });
      top.el.remove();
      return;
    }
    _sawHistory = false;
    document.execCommand("undo"); // input handler pops the matching entry
    if (!_sawHistory) {
      // Native stack had nothing (or our count drifted) — clear stale
      // native markers and try the newest surviving token instead.
      while (editLog.length && editLog[editLog.length - 1].type === "native") editLog.pop();
      _dropDetachedTokens();
      const tok = editLog[editLog.length - 1];
      if (tok && tok.type === "token") {
        editLog.pop();
        editRedo.push({ type: "token", el: tok.el, parent: tok.el.parentNode, next: tok.el.nextSibling });
        tok.el.remove();
      }
    }
  }

  function redoOnce() {
    const top = editRedo[editRedo.length - 1];
    if (top && top.type === "token") {
      editRedo.pop();
      if (top.parent && document.contains(top.parent)) {
        top.parent.insertBefore(top.el, top.next && top.next.parentNode === top.parent ? top.next : null);
        editLog.push({ type: "token", el: top.el });
      }
      return;
    }
    if (top) editRedo.pop();
    document.execCommand("redo"); // input handler re-logs it
  }

  // Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z) inside the sheet route through the
  // token-aware log. Inputs elsewhere (setup panels) keep default behavior.
  document.addEventListener("keydown", e => {
    if (!editing || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    const ae = document.activeElement;
    if (!ae || !ae.closest || !ae.closest(".sheet")) return;
    const k = (e.key || "").toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); undoOnce(); }
    else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redoOnce(); }
  }, true);

  function showEditLossDialog(labels) {
    return new Promise(resolve => {
      const back = document.createElement('div');
      back.className = 'tt-backdrop';
      back.innerHTML = `
        <div class="tt-dialog">
          <h2>⚠ Some fields may have been unlinked</h2>
          <p>Editing may have detached these auto-fill fields from their data — they'll no longer update automatically:<br/>
            <ul style="margin:8px 0 0 16px;padding:0;font-size:13px;color:var(--lpr-muted);line-height:1.8">
              ${labels.map(l => `<li>${l}</li>`).join('')}
            </ul>
          </p>
          <div class="actions">
            <button data-act="undo" class="muted">Undo my edits</button>
            <button data-act="keep" class="primary">Keep my edits</button>
          </div>
        </div>`;
      document.body.appendChild(back);
      const close = keep => { back.remove(); resolve(keep); };
      back.addEventListener('click', e => { if (e.target === back) close(true); });
      back.querySelector('[data-act="undo"]').addEventListener('click', () => close(false));
      back.querySelector('[data-act="keep"]').addEventListener('click', () => close(true));
    });
  }

  // Turn edit mode on/off. Returns a promise that resolves once any
  // lost-field warning dialog raised while turning OFF has been resolved
  // (and any chosen undo has been applied). Callers that don't need to
  // wait (the Edit button itself, the beforeprint safety net) can ignore
  // the returned promise; callers that must not proceed until the user
  // has chosen Keep/Undo (export, save) should await it.
  function toggleEdit() {
    editing = !editing;
    editLog = [];
    editRedo = [];
    const sheets = [...document.querySelectorAll(".sheet")];
    let pending = Promise.resolve();

    if (editing) {
      editSnapshots = sheets.map(sheet => ({
        sheet: sheet,
        html: sheet.innerHTML,
        census: censusTokenSpans(sheet)
      }));
    } else if (editSnapshots.length) {
      const affected = editSnapshots
        .map(snap => ({ snap: snap, lost: diffLostSpans(snap.census, censusTokenSpans(snap.sheet)) }))
        .filter(x => x.lost.length);
      editSnapshots = [];
      if (affected.length) {
        const allLabels = [...new Set(affected.reduce((a, x) => a.concat(x.lost), []))];
        pending = showEditLossDialog(allLabels).then(keep => {
          if (!keep) affected.forEach(x => { x.snap.sheet.innerHTML = x.snap.html; });
        });
      }
    }

    sheets.forEach(s => {
      s.setAttribute("contenteditable", editing);
      s.setAttribute("spellcheck", editing);
      s.classList.toggle("tt-editing", editing);
      // While editing, tokens are atomic chips (non-editable): the caret
      // can't wander inside them, a click selects the whole span, and one
      // Backspace removes it as a single native (undoable) edit.
      s.querySelectorAll(TOKEN_ATTRS.map(a => "[" + a + "]").join(",")).forEach(t => {
        if (editing) t.setAttribute("contenteditable", "false");
        else t.removeAttribute("contenteditable");
      });
    });
    const btn = document.getElementById("tt-edit-btn");
    btn.textContent = editing ? "✓ Done editing" : "Edit";
    btn.classList.toggle("tt-active", editing);
    const fmtBar = document.getElementById("tt-fmt-bar");
    if (fmtBar) fmtBar.style.display = editing ? "contents" : "none";
    if (editing) setupSignatureDrag();
    else teardownSignatureDrag();

    return pending;
  }

  // Exit edit mode (if active) before an export/save action proceeds,
  // awaiting the same lost-field check + dialog that toggleEdit() runs.
  function exitEditModeForAction() {
    return editing ? toggleEdit() : Promise.resolve();
  }

  /* Apply a pt font size to the current selection */
  function applyFontSize(pt) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const span = document.createElement("span");
    span.style.fontSize = pt + "pt";
    try {
      range.surroundContents(span);
    } catch (e) {
      // Selection crosses element boundaries — extract and re-wrap
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    // Re-select the wrapped content
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  /* Apply a hex color to the current selection */
  function applyTextColor(hex) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const span = document.createElement("span");
    span.style.color = hex;
    try {
      range.surroundContents(span);
    } catch (e) {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  /* Signature drag-to-nudge + resize (in edit mode only) */
  const sigDragHandlers = new Map();
  function offsetKey() {
    const file = (location.pathname.split("/").pop() || "default").toLowerCase();
    return "lpr_sig_offset_" + file;
  }
  function parseTranslate(t) {
    const m = /translate\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/.exec(t || "");
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
  }
  function saveSigState(img) {
    const off = parseTranslate(img.style.transform);
    const data = { x: off.x, y: off.y, w: img.offsetWidth };
    try { localStorage.setItem(offsetKey(), JSON.stringify(data)); } catch (e) {}
  }
  function setupSignatureDrag() {
    teardownSignatureDrag();
    document.querySelectorAll("img.lpr-sig-img").forEach(img => {
      img.style.cursor = "move";
      img.style.outline = "1px dashed rgba(40,56,145,0.4)";
      img.style.outlineOffset = "4px";
      img.setAttribute("draggable", "false");
      img.title = "Drag to move \u2014 drag corner to resize";

      // Make parent the positioning context for the handle
      const parent = img.parentElement;
      let positionedParent = false;
      if (parent && getComputedStyle(parent).position === "static") {
        parent.style.position = "relative";
        positionedParent = true;
      }

      // Resize handle
      const handle = document.createElement("div");
      handle.className = "tt-sig-handle";
      handle.style.cssText = [
        "position: absolute",
        "width: 14px", "height: 14px",
        "background: var(--lpr-blue)", "border: 2px solid #fff",
        "border-radius: 50%", "cursor: nwse-resize",
        "z-index: 50",
        "box-shadow: 0 2px 6px rgba(0,0,0,0.25)",
        "pointer-events: auto"
      ].join("; ");
      handle.title = "Drag to resize";
      handle.setAttribute("draggable", "false");
      parent.appendChild(handle);

      function positionHandle() {
        const ir = img.getBoundingClientRect();
        const pr = parent.getBoundingClientRect();
        handle.style.left = (ir.right - pr.left - 7) + "px";
        handle.style.top  = (ir.bottom - pr.top - 7) + "px";
      }
      positionHandle();

      // ---------- Move ----------
      const moveHandler = (ev) => {
        if (ev.target === handle) return; // handle's drag is separate
        ev.preventDefault();
        ev.stopPropagation();
        const isTouch = ev.type === "touchstart";
        const start = isTouch ? ev.touches[0] : ev;
        const sx = start.clientX, sy = start.clientY;
        const orig = parseTranslate(img.style.transform);
        function onMove(e) {
          const p = e.type === "touchmove" ? e.touches[0] : e;
          const dx = orig.x + (p.clientX - sx);
          const dy = orig.y + (p.clientY - sy);
          img.style.transform = "translate(" + dx + "px, " + dy + "px)";
          positionHandle();
          if (e.cancelable) e.preventDefault();
        }
        function onEnd() {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onEnd);
          document.removeEventListener("touchmove", onMove);
          document.removeEventListener("touchend", onEnd);
          saveSigState(img);
        }
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onEnd);
        document.addEventListener("touchmove", onMove, { passive: false });
        document.addEventListener("touchend", onEnd);
      };
      img.addEventListener("mousedown", moveHandler);
      img.addEventListener("touchstart", moveHandler, { passive: false });

      // ---------- Resize ----------
      const resizeHandler = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const isTouch = ev.type === "touchstart";
        const start = isTouch ? ev.touches[0] : ev;
        const sx = start.clientX;
        const startW = img.offsetWidth;
        function onMove(e) {
          const p = e.type === "touchmove" ? e.touches[0] : e;
          const dx = p.clientX - sx;
          const newW = Math.max(60, Math.min(1200, startW + dx));
          img.style.width = newW + "px";
          img.style.maxWidth = newW + "px";
          img.style.height = "auto";
          img.style.maxHeight = "none";
          positionHandle();
          if (e.cancelable) e.preventDefault();
        }
        function onEnd() {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onEnd);
          document.removeEventListener("touchmove", onMove);
          document.removeEventListener("touchend", onEnd);
          saveSigState(img);
        }
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onEnd);
        document.addEventListener("touchmove", onMove, { passive: false });
        document.addEventListener("touchend", onEnd);
      };
      handle.addEventListener("mousedown", resizeHandler);
      handle.addEventListener("touchstart", resizeHandler, { passive: false });

      sigDragHandlers.set(img, { moveHandler, resizeHandler, handle, positionedParent, parent });
    });
  }
  function teardownSignatureDrag() {
    sigDragHandlers.forEach((rec, img) => {
      img.removeEventListener("mousedown", rec.moveHandler);
      img.removeEventListener("touchstart", rec.moveHandler);
      img.style.cursor = "";
      img.style.outline = "";
      img.style.outlineOffset = "";
      img.removeAttribute("title");
      if (rec.handle && rec.handle.parentElement) rec.handle.remove();
      if (rec.positionedParent && rec.parent) rec.parent.style.position = "";
    });
    sigDragHandlers.clear();
  }
  /* --------- UNSAVED-CHANGES TRACKING --------- */
  let hasUnsavedEdits = false;

  function setupEditTracking() {
    // Mark dirty on any user text edit
    document.querySelectorAll(".sheet").forEach(s => {
      s.addEventListener("input", () => { hasUnsavedEdits = true; });
    });
    // Mark dirty on signature drag-end (handled inside the drag handler too)

    // Browser-native warning on tab close / refresh
    window.addEventListener("beforeunload", e => {
      if (!hasUnsavedEdits) return;
      e.preventDefault();
      e.returnValue = "";
    });

    // Intercept in-page navigation (e.g. "← All templates")
    document.addEventListener("click", e => {
      if (!hasUnsavedEdits) return;
      const a = e.target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (a.target === "_blank") return;
      e.preventDefault();
      e.stopPropagation();
      showSaveModal(() => { hasUnsavedEdits = false; location.href = a.href; });
    }, true);
  }

  function injectModalStyles() {
    if (document.getElementById("tt-modal-styles")) return;
    const s = document.createElement("style");
    s.id = "tt-modal-styles";
    s.textContent = `
      .tt-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; padding: 20px;
        font-family: 'Montserrat', sans-serif;
      }
      .tt-dialog {
        background: #fff; border-radius: 12px; padding: 28px 30px;
        max-width: 440px; width: 100%;
        box-shadow: 0 12px 40px rgba(0,0,0,0.25);
      }
      .tt-dialog h2 { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: var(--lpr-ink); }
      .tt-dialog p { margin: 0 0 18px; font-size: 13px; line-height: 1.6; color: var(--lpr-muted); }
      .tt-dialog .actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
      .tt-dialog button {
        font-family: inherit; font-size: 12.5px; font-weight: 600; letter-spacing: 0.3px;
        padding: 10px 18px; border-radius: 999px; cursor: pointer;
        border: 1px solid var(--lpr-blue); background: #fff; color: var(--lpr-blue);
      }
      .tt-dialog button:hover { background: var(--lpr-blue); color: #fff; }
      .tt-dialog button.primary { background: var(--lpr-blue); color: #fff; }
      .tt-dialog button.primary:hover { background: var(--lpr-blue-deep); }
      .tt-dialog button.muted { border-color: rgba(40,56,145,0.18); color: var(--lpr-muted); }
      .tt-dialog button.muted:hover { background: #f4f1ec; color: var(--lpr-ink); }
      .tt-dialog button.danger { border-color: #c33; color: #c33; }
      .tt-dialog button.danger:hover { background: #c33; color: #fff; }
      .tt-modal-input {
        width: 100%; box-sizing: border-box;
        font-family: inherit; font-size: 14px; padding: 9px 13px;
        border: 1px solid rgba(40,56,145,0.3); border-radius: 8px;
        outline: none; margin-bottom: 16px; color: var(--lpr-ink);
      }
      .tt-modal-input:focus { border-color: var(--lpr-blue); box-shadow: 0 0 0 3px rgba(40,56,145,0.12); }

      /* Export button — disabled while an export is in flight */
      .tt-btn[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

      /* Format bar separator */
      .tt-fmt-sep {
        display: inline-block; width: 1px; background: rgba(40,56,145,0.18);
        height: 18px; margin: 0 4px; align-self: center; flex-shrink: 0;
      }
      /* Format buttons — slightly narrower than regular tt-btn */
      .tt-fmt-btn { min-width: 32px; padding-left: 8px; padding-right: 8px; }
      .tt-fmt-btn b, .tt-fmt-btn i { pointer-events: none; font-style: normal; }
      .tt-fmt-btn[data-cmd="italic"] i { font-style: italic; }
      /* Font size picker */
      .tt-size-select {
        height: 28px; padding: 0 8px;
        border: 1px solid rgba(40,56,145,0.25); border-radius: 6px;
        background: #fff; font-family: Montserrat, sans-serif;
        font-size: 12px; font-weight: 500; color: var(--lpr-ink);
        cursor: pointer; outline: none; vertical-align: middle;
        appearance: none; -webkit-appearance: none;
      }
      .tt-size-select:hover { border-color: var(--lpr-blue); background: #f6f7fd; }
      .tt-size-select:focus { border-color: var(--lpr-blue); }
      /* Color picker */
      .tt-color-wrap {
        position: relative; display: inline-flex; align-items: center; gap: 5px;
        height: 28px; padding: 0 10px;
        border: 1px solid rgba(40,56,145,0.25); border-radius: 6px;
        background: #fff; cursor: pointer; vertical-align: middle;
        font-size: 12px; font-weight: 500; color: var(--lpr-ink);
        user-select: none;
      }
      .tt-color-wrap:hover { border-color: var(--lpr-blue); background: #f6f7fd; }
      .tt-color-preview {
        display: none; width: 10px; height: 10px; border-radius: 50%;
        border: 1px solid rgba(0,0,0,0.15); flex-shrink: 0;
      }
      .tt-color-label { pointer-events: none; }
      .tt-color-menu {
        position: absolute; top: calc(100% + 6px); right: 0;
        background: #fff; border-radius: 8px; padding: 8px 10px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.18);
        border: 1px solid rgba(40,56,145,0.12);
        display: flex; gap: 7px; align-items: center; flex-wrap: nowrap;
        z-index: 9999;
      }
      .tt-color-menu[hidden] { display: none; }
      .tt-color-chip {
        width: 24px; height: 24px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 0 1px rgba(0,0,0,0.18);
        cursor: pointer; flex-shrink: 0; transition: transform .12s;
      }
      .tt-color-chip:hover { transform: scale(1.2); }
      .tt-color-chip-clear {
        border-radius: 50%; box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 15px; line-height: 1; color: #1a1a1a; font-weight: 400;
      }

    `;
    document.head.appendChild(s);
  }

  function showSaveModal(onDiscard) {
    const back = document.createElement("div");
    back.className = "tt-backdrop";
    back.innerHTML = `
      <div class="tt-dialog">
        <h2>Save changes before leaving?</h2>
        <p>You've made edits to this template. Save a copy to your Library so you don't lose your work?</p>
        <div class="actions">
          <button data-act="cancel" class="muted">Stay on page</button>
          <button data-act="discard" class="danger">Discard</button>
          <button data-act="save" class="primary">Save to Library</button>
        </div>
      </div>`;
    document.body.appendChild(back);
    function close() { back.remove(); }
    back.addEventListener("click", e => { if (e.target === back) close(); });
    back.querySelector('[data-act="cancel"]').addEventListener("click", close);
    back.querySelector('[data-act="discard"]').addEventListener("click", () => {
      close();
      onDiscard();
    });
    back.querySelector('[data-act="save"]').addEventListener("click", () => {
      close();
      // saveAs() prompts for a name, then offers a "Go back to the index now?" path.
      saveAs();
      hasUnsavedEdits = false;
    });
  }

  /* --------- UNFILLED FIELDS CHECK --------- */
  function checkUnfilledFields() {
    const warnings = [];
    const hasEmpty = sel => [...document.querySelectorAll(sel)]
      .filter(el => { const sheet = el.closest('.sheet'); return !sheet || sheet.offsetHeight > 0; })
      .some(el => !el.textContent.trim());
    if (hasEmpty('[data-contact-field]'))  warnings.push('No recipient selected — recipient fields will be blank');
    if (hasEmpty('[data-tenant-field]'))   warnings.push('No tenant selected — tenant fields will be blank');
    if (hasEmpty('[data-vendor-field]'))   warnings.push('No vendor selected — vendor fields will be blank');
    return warnings;
  }

  function showUnfilledWarning(warnings, onContinue) {
    const back = document.createElement('div');
    back.className = 'tt-backdrop';
    back.innerHTML = `
      <div class="tt-dialog">
        <h2>⚠ Some fields are unfilled</h2>
        <p>The following will appear blank:<br/>
          <ul style="margin:8px 0 0 16px;padding:0;font-size:13px;color:var(--lpr-muted);line-height:1.8">
            ${warnings.map(w => `<li>${w}</li>`).join('')}
          </ul>
        </p>
        <div class="actions">
          <button data-act="cancel" class="muted">Go back</button>
          <button data-act="ok" class="primary">Continue anyway</button>
        </div>
      </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('[data-act="cancel"]').addEventListener('click', close);
    back.querySelector('[data-act="ok"]').addEventListener('click', () => { close(); onContinue(); });
  }

  /* --------- PRINT BLANK --------- */
  let printBlankActive = false;
  function printBlank() {
    // Re-entrancy guard: a second call before the first call's afterprint
    // restore has fired would snapshot the already-blanked DOM and then
    // re-blank it on its own restore. Ignore calls while one is in flight.
    if (printBlankActive) return;
    printBlankActive = true;

    // Only clear recipient/fill-in fields — not employee or owner (company info stays)
    const FIELD_SEL = [
      '[data-fill-field]',
      '[data-contact-field]',
      '[data-tenant-field]',
      '[data-vendor-field]',
    ].join(',');

    // 1. Clear fill-in field spans
    const els = [...document.querySelectorAll(FIELD_SEL)];
    const savedHtml = els.map(el => el.innerHTML);
    els.forEach(el => { el.innerHTML = ''; });

    // 2. Signoff: hide sig image, employee name, title, and separator dot
    //    so only the company name (data-owner-field="name") remains
    const sigEls = [
      ...document.querySelectorAll('img.lpr-sig-img'),
      ...document.querySelectorAll('.signed-name'),
      ...document.querySelectorAll('.signed-role [data-employee-field="title"]'),
      ...document.querySelectorAll('.signed-role .owner-sep'),
    ];
    sigEls.forEach(el => { el.style.display = 'none'; });

    // 3. Preserve info-grid layout: keep .no-print spacers in grid flow but invisible
    //    (safety net for templates that haven't been patched with the print CSS fix)
    const gridNoPrint = [...document.querySelectorAll('.info-grid .no-print')];
    gridNoPrint.forEach(el => { el.style.setProperty('display', 'block', 'important'); el.style.visibility = 'hidden'; el.style.height = '0'; el.style.minHeight = '0'; el.style.padding = '0'; el.style.overflow = 'hidden'; });

    // 4. Hide short connector text nodes orphaned between two empty field spans
    const sepNodes = gatherBlankSeparators();
    const savedSepText = sepNodes.map(n => n.textContent);
    sepNodes.forEach(n => { n.textContent = ''; });

    let restored = false;
    function restore() {
      if (restored) return; // idempotent — safe if called twice
      restored = true;
      els.forEach((el, i) => { el.innerHTML = savedHtml[i]; });
      sigEls.forEach(el => { el.style.display = ''; });
      gridNoPrint.forEach(el => { el.style.removeProperty('display'); el.style.visibility = ''; el.style.height = ''; el.style.minHeight = ''; el.style.padding = ''; el.style.overflow = ''; });
      sepNodes.forEach((n, i) => { n.textContent = savedSepText[i]; });
      printBlankActive = false;
    }
    window.addEventListener('afterprint', restore, { once: true });
    window.print();
  }

  function gatherBlankSeparators() {
    const FIELD_ATTRS = ['data-fill-field','data-contact-field','data-tenant-field',
                         'data-employee-field','data-owner-field','data-vendor-field'];

    function isEmptyFieldEl(el) {
      return el && el.nodeType === 1 &&
        FIELD_ATTRS.some(a => el.hasAttribute(a)) && !el.textContent.trim();
    }
    function prevMeaningfulSibling(node) {
      let n = node.previousSibling;
      while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.previousSibling;
      return n;
    }
    function nextMeaningfulSibling(node) {
      let n = node.nextSibling;
      while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
      return n;
    }

    const result = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      // Skip long text — it's content, not a connector (catches "to", ", ", " · ", etc.)
      if (node.textContent.trim().length > 12) continue;
      if (isEmptyFieldEl(prevMeaningfulSibling(node)) && isEmptyFieldEl(nextMeaningfulSibling(node))) {
        result.push(node);
      }
    }
    return result;
  }

  /* --------- EXPORT --------- */
  async function doExport(kind) {
    const warnings = kind === "print" ? [] : checkUnfilledFields();
    if (warnings.length) {
      showUnfilledWarning(warnings, () => doExportNow(kind));
      return;
    }
    await doExportNow(kind);
  }

  // Module-level re-entrancy guard: a double-click (or a menu-item click
  // while a slow CDN load is still in flight) must not start a second
  // concurrent export — that races inlineImgSrcs()'s save/restore of <img>
  // srcs and can bake a broken image into the export and fire two downloads.
  let exporting = false;

  function setExportButtonDisabled(disabled) {
    const btn = document.getElementById("tt-export-btn");
    if (!btn) return;
    btn.disabled = disabled;
    if (disabled) btn.setAttribute("aria-disabled", "true");
    else btn.removeAttribute("aria-disabled");
  }

  async function doExportNow(kind) {
    if (exporting) return;
    exporting = true;
    setExportButtonDisabled(true);
    const name = baseFilename();
    try {
      if (kind === "print") return window.print();
      if (kind === "html") return await exportHtml(name);
      if (kind === "png")  return await exportPng(name);
      if (kind === "pdf")  return await exportPdf(name);
    } catch (e) {
      console.error(e);
      const back = document.createElement('div');
      back.className = 'tt-backdrop';
      back.innerHTML = `<div class="tt-dialog"><h2>Export failed</h2><p style="color:var(--lpr-muted);font-size:13px">${e.message || e}</p><div class="actions"><button data-act="ok" class="primary">OK</button></div></div>`;
      document.body.appendChild(back);
      back.querySelector('[data-act="ok"]').addEventListener('click', () => back.remove());
    } finally {
      exporting = false;
      setExportButtonDisabled(false);
    }
  }

  function baseFilename() {
    let t = document.title || "document";
    t = t.replace(/^LPR\s*[—–-]\s*/, "");
    return t.replace(/[^a-z0-9\- ]/gi, "").trim() || "document";
  }

  async function exportHtml(name) {
    // Track 4 §4: this is the mode-bar central export-scrub hook point. If
    // mode-bar.js is loaded on this page, it overrides
    // document.documentElement.cloneNode (or a legacy per-template override
    // does, e.g. Security Deposit.html's inline script until P1d migrates
    // it) to strip .mode-hidden/.mode-bar nodes from the returned clone
    // *before* we ever see it — so only the active variant is captured with
    // no code here. Templates with no mode-bar/legacy override get a plain
    // native deep clone, unchanged from today. Do not change this call to a
    // shallow clone or clone a sub-node instead of documentElement — either
    // would bypass the hook. Call cloneNode exactly once per export (no
    // double-clone).
    const clone = document.documentElement.cloneNode(true);
    clone.dataset.lprSnapshot = '1';

    // Strip editing UI, panels, browser-extension injections
    clone.querySelectorAll(".toolbar, .no-print, .label, #lpr-fill-panel").forEach(el => el.remove());
    clone.querySelectorAll("[id^='automa'], [class*='automa']").forEach(el => el.remove());

    // Remove all scripts — exported file is a static snapshot
    clone.querySelectorAll("script").forEach(el => el.remove());

    // Remove panel-injected style blocks (tenant/owner/vendor/modal CSS)
    clone.querySelectorAll("style[id^='lpr-'], style[id^='tt-'], style.automa-element-selector").forEach(el => el.remove());

    // Clean up edit state
    clone.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
    clone.querySelectorAll(".tt-editing").forEach(el => el.classList.remove("tt-editing"));

    // White background — no page chrome in exported file
    const bodyEl = clone.querySelector("body");
    if (bodyEl) { bodyEl.style.background = "#fff"; bodyEl.style.padding = "0"; }

    const baseUrl = location.href.substring(0, location.href.lastIndexOf("/") + 1);

    // Inline local stylesheets so exported file is fully self-contained
    // (CSS custom properties resolve correctly without needing brand.css).
    // Skipped on file:// pages: fetch() is CORS-blocked for file: URLs by
    // browser policy (real users have no special flags set), so attempting
    // it here only logs a console error before falling through to the same
    // absolutized <link href> fallback below — better to go straight there.
    if (location.protocol !== 'file:') {
      for (const link of [...clone.querySelectorAll('link[rel~="stylesheet"]')]) {
        const raw = link.getAttribute('href');
        if (!raw || /^https?:/.test(raw)) continue;
        try {
          const resp = await fetch(baseUrl + raw);
          if (resp.ok) {
            const style = document.createElement('style');
            style.textContent = await resp.text();
            link.parentNode.replaceChild(style, link);
          }
        } catch (e) {}
      }
    }

    // Make relative asset paths absolute
    clone.querySelectorAll("[src], [href]").forEach(el => {
      ["src", "href"].forEach(attr => {
        const v = el.getAttribute(attr);
        if (!v) return;
        if (/^(?:https?:|data:|blob:|mailto:|tel:|#|\/)/.test(v)) return;
        el.setAttribute(attr, baseUrl + v);
      });
    });

    const html = "<!DOCTYPE html>\n" + clone.outerHTML;
    triggerDownload(new Blob([html], { type: "text/html;charset=utf-8" }), name + ".html");
  }

  // Pre-convert <img> elements to data URLs so html2canvas never fetches them.
  // On file:// pages, loading images without crossOrigin is same-origin and safe;
  // adding crossOrigin="anonymous" (what useCORS does) breaks CORS and taints the canvas.
  // Registry of pre-encoded data URIs for sheet-critical images
  // (assets/img-data.js → window.LPR_IMG_DATA). On file:// pages the canvas
  // route below ALWAYS taints (drawing a file:// image marks the canvas
  // unexportable), which used to silently strip the logo/form image out of
  // every PNG/PDF export. Script loading is not subject to that restriction,
  // so the registry is the only reliable file://-compatible source of image
  // bytes. Lazy-loaded at export time; resolves (never rejects) so exports
  // still proceed registry-less on pages/setups where it can't load.
  let imgDataPromise = null;
  function loadImgData() {
    if (window.LPR_IMG_DATA) return Promise.resolve();
    if (imgDataPromise) return imgDataPromise;
    imgDataPromise = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'assets/img-data.js';
      s.onload = resolve;
      s.onerror = () => { imgDataPromise = null; resolve(); };
      document.head.appendChild(s);
    });
    return imgDataPromise;
  }
  function imgDataFor(url) {
    if (!window.LPR_IMG_DATA || !url || url.startsWith('data:')) return null;
    const base = decodeURIComponent(url.split('/').pop().split('?')[0].split('#')[0]);
    return window.LPR_IMG_DATA[base] || null;
  }

  async function inlineImgSrcs(el) {
    await loadImgData();
    const imgs = [...el.querySelectorAll('img')];
    const origSrcs = new Map();
    await Promise.all(imgs.map(img => new Promise(resolve => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) { resolve(); return; }
      const data = imgDataFor(src);
      if (data) { origSrcs.set(img, src); img.src = data; resolve(); return; }
      origSrcs.set(img, src);
      const tmp = new Image();
      // crossOrigin only on https — file:// has no CORS server so it causes onerror
      if (location.protocol !== 'file:') tmp.crossOrigin = 'anonymous';
      tmp.onload = () => {
        const c = document.createElement('canvas');
        c.width = tmp.naturalWidth || 1; c.height = tmp.naturalHeight || 1;
        c.getContext('2d').drawImage(tmp, 0, 0);
        try { img.src = c.toDataURL(); } catch(e) {}
        resolve();
      };
      tmp.onerror = resolve;
      tmp.src = src;
    })));
    // CSS background images (e.g. Certificate of Mailing's form scan) taint
    // the capture the same way — swap any registry-known background to its
    // data URI for the duration. setProperty('important') so the inline
    // override beats the !important stylesheet rules that set these.
    const bgRestores = [];
    if (window.LPR_IMG_DATA) {
      [el, ...el.querySelectorAll('*')].forEach(node => {
        const bg = getComputedStyle(node).backgroundImage;
        if (!bg || bg === 'none' || bg.includes('data:')) return;
        const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
        const data = m && imgDataFor(m[1]);
        if (!data) return;
        bgRestores.push({ node,
          prev: node.style.getPropertyValue('background-image'),
          prevPri: node.style.getPropertyPriority('background-image') });
        node.style.setProperty('background-image', 'url("' + data + '")', 'important');
      });
    }
    return () => {
      origSrcs.forEach((src, img) => img.setAttribute('src', src));
      bgRestores.forEach(r => {
        if (r.prev) r.node.style.setProperty('background-image', r.prev, r.prevPri);
        else r.node.style.removeProperty('background-image');
      });
    };
  }

  /* --------- EXPORT-ROOT RESOLUTION --------- */
  // A template can mark a hidden "true" printable layout with
  // data-tt-export-root so PNG/PDF export captures it instead of whatever
  // `.sheet` elements happen to be visible on screen (e.g. a scaled preview
  // thumbnail). The attribute value, if non-empty, names a body class that
  // must be active for the root to be used — this lets a template scope the
  // override to one of several view/print modes without any per-template
  // logic living here.
  function findExportRoot() {
    const root = document.querySelector('[data-tt-export-root]');
    if (!root) return null;
    const modeClass = root.getAttribute('data-tt-export-root');
    if (modeClass && !document.body.classList.contains(modeClass)) return null;
    return root;
  }

  // Reveal a hidden export root for the duration of a capture. Only ever
  // touches the inline `display` so restoring puts it back exactly as found.
  function revealExportRoot(root) {
    const prevDisplay = root.style.display;
    root.style.display = "block";
    return function restoreExportRoot() { root.style.display = prevDisplay; };
  }

  // Resolve what to hand to html2canvas: prefer a mode-appropriate export
  // root when present, else fall back to the normal on-screen `.sheet`
  // elements (unchanged behavior for every template that doesn't opt in).
  // Always call the returned restore() when done, finally-style.
  //
  // Coexistence with the mode-bar export scrub (Track 4 §4): this operates
  // on the LIVE document (real elements, filtered to what's on-screen —
  // e.g. `.filter(s => s.offsetHeight > 0)` below), used only by PNG/PDF.
  // It never touches document.documentElement.cloneNode, so it can't
  // double-apply with the clone-based scrub used by exportHtml()/
  // buildSaveHtml() (HTML export, Save As, Save Edits) — the two mechanisms
  // run on different DOM references for different export kinds and don't
  // call each other.
  function resolveExportSheets() {
    const root = findExportRoot();
    if (!root) {
      const sheets = [...document.querySelectorAll(".sheet")].filter(s => s.offsetHeight > 0);
      return { sheets: sheets, restore: () => {} };
    }
    const restore = revealExportRoot(root);
    let sheets;
    if (root.classList.contains("sheet")) {
      sheets = [root];
    } else if (root.children.length) {
      // Each direct child is treated as one full printable page/unit. This
      // covers a root that wraps several standalone .sheet elements *and* a
      // root that wraps one assembled page which itself contains nested
      // .sheet fragments — either way we don't need to know which shape a
      // given template uses.
      sheets = [...root.children];
    } else {
      sheets = [...root.querySelectorAll(".sheet")];
    }
    return { sheets: sheets, restore: restore };
  }

  async function exportPng(name) {
    await ensureLib("assets/vendor/html2canvas.min.js", "html2canvas");
    const { sheets, restore } = resolveExportSheets();
    try {
      if (sheets.length === 0) return;
      for (let i = 0; i < sheets.length; i++) {
        const restoreImgs = await inlineImgSrcs(sheets[i]);
        const isFile = location.protocol === 'file:';
        // No foreignObjectRendering: that mode drops all external resources
        // under file:// (the historical blank-logo exports). inlineImgSrcs()
        // has already converted registry-known images + backgrounds to data
        // URIs, so the standard renderer draws them and the canvas stays
        // untainted. allowTaint stays false: an unregistered file:// image
        // renders blank instead of hard-failing the whole export at toBlob.
        const canvas = await window.html2canvas(sheets[i], {
          scale: 2,
          useCORS: !isFile,
          allowTaint: false,
          foreignObjectRendering: false,
          backgroundColor: "#ffffff",
          logging: false
        });
        restoreImgs();
        const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
        const suffix = sheets.length > 1 ? "-" + (i + 1) : "";
        triggerDownload(blob, name + suffix + ".png");
        await new Promise(r => setTimeout(r, 300));
      }
    } finally {
      restore();
    }
  }

  async function exportPdf(name) {
    await ensureLib("assets/vendor/html2canvas.min.js", "html2canvas");
    await ensureLib("assets/vendor/jspdf.umd.min.js", "jspdf");
    const { sheets, restore } = resolveExportSheets();
    try {
      if (sheets.length === 0) return;
      const r0 = sheets[0].getBoundingClientRect();
      const widthIn  = r0.width  / 96;
      const heightIn = r0.height / 96;
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        unit: "in",
        format: [widthIn, heightIn],
        orientation: widthIn > heightIn ? "landscape" : "portrait"
      });
      for (let i = 0; i < sheets.length; i++) {
        const restoreImgs = await inlineImgSrcs(sheets[i]);
        const isFile = location.protocol === 'file:';
        // No foreignObjectRendering: that mode drops all external resources
        // under file:// (the historical blank-logo exports). inlineImgSrcs()
        // has already converted registry-known images + backgrounds to data
        // URIs, so the standard renderer draws them and the canvas stays
        // untainted. allowTaint stays false: an unregistered file:// image
        // renders blank instead of hard-failing the whole export at toBlob.
        const canvas = await window.html2canvas(sheets[i], {
          scale: 2,
          useCORS: !isFile,
          allowTaint: false,
          foreignObjectRendering: false,
          backgroundColor: "#ffffff",
          logging: false
        });
        restoreImgs();
        const r = sheets[i].getBoundingClientRect();
        const wIn = r.width  / 96;
        const hIn = r.height / 96;
        const imgData = canvas.toDataURL("image/jpeg", 0.97);
        if (i > 0) doc.addPage([wIn, hIn], wIn > hIn ? "landscape" : "portrait");
        doc.addImage(imgData, "JPEG", 0, 0, wIn, hIn);
      }
      doc.save(name + ".pdf");
    } finally {
      restore();
    }
  }

  // Per-URL cached load promise (same pattern as fill-fields.js's
  // window._lpr_fp_promise flatpickr loader) so concurrent/subsequent calls
  // for the same script await the one in-flight load instead of injecting
  // a second <script> tag.
  const libPromises = {};
  function ensureLib(url, globalName) {
    if (window[globalName]) return Promise.resolve();
    if (libPromises[url]) return libPromises[url];
    const p = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = url;
      s.onload = () => res();
      s.onerror = () => { delete libPromises[url]; rej(new Error("Failed to load " + url)); };
      document.head.appendChild(s);
    });
    libPromises[url] = p;
    return p;
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* --------- SHARED: build a clean HTML snapshot for saving --------- */
  async function buildSaveHtml() {
    // Same mode-bar export-scrub hook as exportHtml() above (Track 4 §4) —
    // Save As and Save Edits both route through this one function, so they
    // inherit the same single cloneNode(true) call and the same "active
    // variant only" guarantee with no separate scrub logic here.
    const clone = document.documentElement.cloneNode(true);
    clone.dataset.lprSnapshot = '1'; // tells employee.js not to overwrite baked-in values

    // Strip all UI chrome — re-injected fresh on next open
    clone.querySelectorAll([
      ".tt-btn", ".tt-export-wrap", "#tt-fmt-bar",
      "#lpr-fill-panel", "#lpr-insert-panel", // setup/insert panels must not be baked in
      ".tt-backdrop",                          // open modals
      ".tt-sig-handle",                        // signature drag handles
      "[id^='automa']", "[class*='automa']"    // browser extension injections
    ].join(", ")).forEach(el => el.remove());

    // Strip dynamically-injected <style> blocks (re-injected by scripts on load)
    clone.querySelectorAll(
      "style[id^='lpr-'], style[id^='tt-'], style.automa-element-selector"
    ).forEach(el => el.remove());

    // Clean up edit-mode state
    clone.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
    clone.querySelectorAll(".tt-editing").forEach(el => el.classList.remove("tt-editing"));

    // Inline local stylesheets so they survive the view.html document.write
    // context. Skipped on file:// pages for the same reason as exportHtml()
    // above — fetch() is CORS-blocked for file: URLs, and the <base> tag
    // added below already makes the un-inlined, absolutized <link href>
    // resolve correctly, so there's no functional loss, only one fewer
    // guaranteed-to-fail network attempt (and its console error).
    const baseUrl = location.href.replace(/[?#].*$/, "").replace(/\/[^/]*$/, "/");
    if (location.protocol !== 'file:') {
      for (const link of [...clone.querySelectorAll('link[rel~="stylesheet"]')]) {
        const raw = link.getAttribute('href');
        if (!raw || /^https?:/.test(raw)) continue;
        try {
          const abs = /^(?:file:|data:|blob:)/.test(raw) ? raw : baseUrl + raw;
          const resp = await fetch(abs);
          if (resp.ok) {
            const style = document.createElement('style');
            style.textContent = await resp.text();
            link.parentNode.replaceChild(style, link);
          }
        } catch (e) {}
      }
    }

    // <base> tag so scripts/images resolve relative paths from the right directory
    const headEl = clone.querySelector("head");
    if (headEl) {
      const existing = headEl.querySelector("base");
      if (existing) existing.remove();
      const base = document.createElement("base");
      base.href = baseUrl;
      headEl.insertBefore(base, headEl.firstChild);
    }

    // Absolutize remaining relative asset paths
    clone.querySelectorAll("[src], [href]").forEach(el => {
      ["src", "href"].forEach(attr => {
        const v = el.getAttribute(attr);
        if (!v) return;
        if (/^(?:https?:|data:|blob:|mailto:|tel:|#|\/)/.test(v)) return;
        el.setAttribute(attr, baseUrl + v);
      });
    });

    return "<!DOCTYPE html>\n" + clone.outerHTML;
  }

  /* --------- SAVE AS — create a new library entry --------- */
  async function saveAs() {
    await exitEditModeForAction(); // exit edit mode (with lost-field safety check) before saving
    const warnings = checkUnfilledFields();
    if (warnings.length) { showUnfilledWarning(warnings, () => doSaveAs()); return; }
    doSaveAs();
  }

  async function doSaveAs() {
    const defaultName = baseFilename() + " — Copy";
    const name = await new Promise(resolve => {
      const back = document.createElement('div');
      back.className = 'tt-backdrop';
      back.innerHTML = `
        <div class="tt-dialog">
          <h2>Save As</h2>
          <p>Give this template a name for your library.</p>
          <input class="tt-modal-input" type="text" placeholder="Template name" value="${defaultName.replace(/"/g, '&quot;')}">
          <div class="actions">
            <button data-act="cancel" class="muted">Cancel</button>
            <button data-act="ok" class="primary">Save</button>
          </div>
        </div>`;
      document.body.appendChild(back);
      const input = back.querySelector('input');
      input.select();
      const close = val => { back.remove(); resolve(val); };
      back.querySelector('[data-act="cancel"]').addEventListener('click', () => close(null));
      back.querySelector('[data-act="ok"]').addEventListener('click', () => close(input.value.trim() || null));
      input.addEventListener('keydown', e => { if (e.key === 'Enter') close(input.value.trim() || null); if (e.key === 'Escape') close(null); });
    });
    if (!name) return;

    const html = await buildSaveHtml();
    const id = "c_" + Date.now().toString(36);
    const saved = JSON.parse(localStorage.getItem("lpr_custom_templates") || "{}");
    saved[id] = { id, name: name.trim(), html, base: decodeURIComponent(location.pathname.split("/").pop()), savedAt: new Date().toISOString() };
    localStorage.setItem("lpr_custom_templates", JSON.stringify(saved));
    const goIndex = await showConfirm(
      `<strong>${name}</strong> saved to your template library.<br>Go back to the index now?`,
      'Go to index'
    );
    if (goIndex) location.href = "index.html";
  }

  function showAlert(message) {
    const back = document.createElement('div');
    back.className = 'tt-backdrop';
    back.innerHTML = `<div class="tt-dialog"><p style="color:var(--lpr-muted);font-size:13px;margin:0 0 16px">${message}</p><div class="actions"><button data-act="ok" class="primary">OK</button></div></div>`;
    document.body.appendChild(back);
    back.querySelector('[data-act="ok"]').addEventListener('click', () => back.remove());
  }

  function showConfirm(message, label) {
    return new Promise(resolve => {
      const back = document.createElement('div');
      back.className = 'tt-backdrop';
      back.innerHTML = `<div class="tt-dialog"><p style="color:var(--lpr-muted);font-size:13px;margin:0 0 16px">${message}</p><div class="actions"><button data-act="cancel" class="muted">Cancel</button><button data-act="ok" class="primary">${label || 'OK'}</button></div></div>`;
      document.body.appendChild(back);
      const close = val => { back.remove(); resolve(val); };
      back.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false));
      back.querySelector('[data-act="ok"]').addEventListener('click', () => close(true));
    });
  }

  /* --------- SAVE EDITS — overwrite an existing library entry --------- */
  function doSaveEdits(id) {
    const warnings = checkUnfilledFields();
    if (warnings.length) { showUnfilledWarning(warnings, () => doSaveEditsNow(id)); return; }
    doSaveEditsNow(id);
  }

  async function doSaveEditsNow(id) {
    const saved = JSON.parse(localStorage.getItem("lpr_custom_templates") || "{}");
    if (!saved[id]) { showAlert("This library entry no longer exists."); return; }
    const confirmed = await showConfirm(
      `Overwrite <strong>${saved[id].name}</strong> with your current edits?<br><small>This cannot be undone. Use Save As to keep the original.</small>`,
      'Overwrite'
    );
    if (!confirmed) return;
    const html = await buildSaveHtml();
    saved[id].html = html;
    saved[id].savedAt = new Date().toISOString();
    localStorage.setItem("lpr_custom_templates", JSON.stringify(saved));
    hasUnsavedEdits = false;
    const btn = document.getElementById("tt-save-edits-btn");
    if (btn) { btn.textContent = "✓ Saved"; setTimeout(() => { btn.textContent = "Save Edits"; }, 2000); }
  }
})();
