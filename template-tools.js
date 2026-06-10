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
      b.addEventListener("click", () => {
        expMenu.hidden = true;
        if (b.dataset.export === "print-blank") { if (editing) toggleEdit(); printBlank(); return; }
        if (editing) toggleEdit(); // exit edit mode before exporting
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
        document.execCommand(btn.dataset.cmd, false, null);
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
  function toggleEdit() {
    editing = !editing;
    const sheets = document.querySelectorAll(".sheet");
    sheets.forEach(s => {
      s.setAttribute("contenteditable", editing);
      s.setAttribute("spellcheck", editing);
      s.classList.toggle("tt-editing", editing);
    });
    const btn = document.getElementById("tt-edit-btn");
    btn.textContent = editing ? "✓ Done editing" : "Edit";
    btn.classList.toggle("tt-active", editing);
    const fmtBar = document.getElementById("tt-fmt-bar");
    if (fmtBar) fmtBar.style.display = editing ? "contents" : "none";
    if (editing) setupSignatureDrag();
    else teardownSignatureDrag();
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
  function printBlank() {
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

    function restore() {
      els.forEach((el, i) => { el.innerHTML = savedHtml[i]; });
      sigEls.forEach(el => { el.style.display = ''; });
      gridNoPrint.forEach(el => { el.style.removeProperty('display'); el.style.visibility = ''; el.style.height = ''; el.style.minHeight = ''; el.style.padding = ''; el.style.overflow = ''; });
      sepNodes.forEach((n, i) => { n.textContent = savedSepText[i]; });
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

  async function doExportNow(kind) {
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
    }
  }

  function baseFilename() {
    let t = document.title || "document";
    t = t.replace(/^LPR\s*[—–-]\s*/, "");
    return t.replace(/[^a-z0-9\- ]/gi, "").trim() || "document";
  }

  async function exportHtml(name) {
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
    // (CSS custom properties resolve correctly without needing brand.css)
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
  async function inlineImgSrcs(el) {
    const imgs = [...el.querySelectorAll('img')];
    const origSrcs = new Map();
    await Promise.all(imgs.map(img => new Promise(resolve => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) { resolve(); return; }
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
    return () => origSrcs.forEach((src, img) => img.setAttribute('src', src));
  }

  async function exportPng(name) {
    await ensureLib("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js", "html2canvas");
    const sheets = [...document.querySelectorAll(".sheet")].filter(s => s.offsetHeight > 0);
    if (sheets.length === 0) return;
    for (let i = 0; i < sheets.length; i++) {
      const restore = await inlineImgSrcs(sheets[i]);
      const isFile = location.protocol === 'file:';
      const canvas = await window.html2canvas(sheets[i], {
        scale: 2,
        useCORS: !isFile,
        allowTaint: isFile,
        foreignObjectRendering: isFile,
        backgroundColor: "#ffffff",
        logging: false
      });
      restore();
      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      const suffix = sheets.length > 1 ? "-" + (i + 1) : "";
      triggerDownload(blob, name + suffix + ".png");
      await new Promise(r => setTimeout(r, 300));
    }
  }

  async function exportPdf(name) {
    await ensureLib("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js", "html2canvas");
    await ensureLib("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js", "jspdf");
    const sheets = [...document.querySelectorAll(".sheet")].filter(s => s.offsetHeight > 0);
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
      const restore = await inlineImgSrcs(sheets[i]);
      const isFile = location.protocol === 'file:';
      const canvas = await window.html2canvas(sheets[i], {
        scale: 2,
        useCORS: !isFile,
        allowTaint: isFile,
        foreignObjectRendering: isFile,
        backgroundColor: "#ffffff",
        logging: false
      });
      restore();
      const r = sheets[i].getBoundingClientRect();
      const wIn = r.width  / 96;
      const hIn = r.height / 96;
      const imgData = canvas.toDataURL("image/jpeg", 0.97);
      if (i > 0) doc.addPage([wIn, hIn], wIn > hIn ? "landscape" : "portrait");
      doc.addImage(imgData, "JPEG", 0, 0, wIn, hIn);
    }
    doc.save(name + ".pdf");
  }

  function ensureLib(url, globalName) {
    return new Promise((res, rej) => {
      if (window[globalName]) return res();
      const s = document.createElement("script");
      s.src = url;
      s.onload = () => res();
      s.onerror = () => rej(new Error("Failed to load " + url));
      document.head.appendChild(s);
    });
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

    // Inline local stylesheets so they survive the view.html document.write context
    const baseUrl = location.href.replace(/[?#].*$/, "").replace(/\/[^/]*$/, "/");
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
  function saveAs() {
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
  async function doSaveEdits(id) {
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
