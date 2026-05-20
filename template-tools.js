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

    // EXPORT dropdown
    const wrap = document.createElement("div");
    wrap.className = "tt-export-wrap";
    wrap.innerHTML = `
      <button class="tt-btn" id="tt-export-btn">Export <span class="tt-caret">▾</span></button>
      <div class="tt-export-menu" hidden>
        <button class="tt-menu-item" data-export="print">Print</button>
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
        doExport(b.dataset.export);
      });
    });
    document.addEventListener("click", e => {
      if (!wrap.contains(e.target)) expMenu.hidden = true;
    });

    // SAVE AS
    const saveBtn = mkBtn("Save As", saveAs);
    saveBtn.title = "Save this filled-in template to your library";
    toolbar.appendChild(saveBtn);

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
    if (editing) setupSignatureDrag();
    else teardownSignatureDrag();
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
        "background: #283891", "border: 2px solid #fff",
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
      .tt-dialog h2 { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #0e1430; }
      .tt-dialog p { margin: 0 0 18px; font-size: 13px; line-height: 1.6; color: #5a5f72; }
      .tt-dialog .actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
      .tt-dialog button {
        font-family: inherit; font-size: 12.5px; font-weight: 600; letter-spacing: 0.3px;
        padding: 10px 18px; border-radius: 999px; cursor: pointer;
        border: 1px solid #283891; background: #fff; color: #283891;
      }
      .tt-dialog button:hover { background: #283891; color: #fff; }
      .tt-dialog button.primary { background: #283891; color: #fff; }
      .tt-dialog button.primary:hover { background: #1c2870; }
      .tt-dialog button.muted { border-color: rgba(40,56,145,0.18); color: #5a5f72; }
      .tt-dialog button.muted:hover { background: #f4f1ec; color: #0e1430; }
      .tt-dialog button.danger { border-color: #c33; color: #c33; }
      .tt-dialog button.danger:hover { background: #c33; color: #fff; }
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
          <ul style="margin:8px 0 0 16px;padding:0;font-size:13px;color:#5a5f72;line-height:1.8">
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
      if (kind === "html") return exportHtml(name);
      if (kind === "png")  return await exportPng(name);
      if (kind === "pdf")  return await exportPdf(name);
    } catch (e) {
      alert("Export failed: " + e.message);
      console.error(e);
    }
  }

  function baseFilename() {
    let t = document.title || "document";
    t = t.replace(/^LPR\s*[—–-]\s*/, "");
    return t.replace(/[^a-z0-9\- ]/gi, "").trim() || "document";
  }

  function exportHtml(name) {
    // Clean up edit-mode state before saving
    const clone = document.documentElement.cloneNode(true);
    clone.dataset.lprSnapshot = '1'; // tells employee.js not to overwrite baked-in values
    clone.querySelectorAll(".toolbar, .no-print, #lpr-fill-panel").forEach(el => el.remove());
    clone.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
    clone.querySelectorAll(".tt-editing").forEach(el => el.classList.remove("tt-editing"));
    // Make asset paths absolute so the file works from anywhere
    const baseUrl = location.href.substring(0, location.href.lastIndexOf("/") + 1);
    clone.querySelectorAll("[src], [href]").forEach(el => {
      ["src", "href"].forEach(attr => {
        const v = el.getAttribute(attr);
        if (!v) return;
        if (/^(?:https?:|data:|blob:|mailto:|tel:|#|\/)/.test(v)) return;
        el.setAttribute(attr, baseUrl + v);
      });
    });
    const html = "<!DOCTYPE html>\n" + clone.outerHTML;
    triggerDownload(new Blob([html], { type: "text/html" }), name + ".html");
  }

  async function exportPng(name) {
    await ensureLib("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js", "html2canvas");
    const sheets = [...document.querySelectorAll(".sheet")].filter(s => s.offsetHeight > 0);
    if (sheets.length === 0) return;
    for (let i = 0; i < sheets.length; i++) {
      const canvas = await window.html2canvas(sheets[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });
      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      const suffix = sheets.length > 1 ? "-" + (i + 1) : "";
      triggerDownload(blob, name + suffix + ".png");
      await new Promise(r => setTimeout(r, 300));
    }
  }

  async function exportPdf(name) {
    await ensureLib("https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js", "html2pdf");
    const sheets = [...document.querySelectorAll(".sheet")].filter(s => s.offsetHeight > 0);
    if (sheets.length === 0) return;
    // Use first sheet's dimensions for the page size (assumes uniform pages)
    const r = sheets[0].getBoundingClientRect();
    const widthIn  = r.width  / 96;
    const heightIn = r.height / 96;
    // Build container with all sheets (one per page)
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-99999px";
    container.style.top = "0";
    sheets.forEach((s, i) => {
      const clone = s.cloneNode(true);
      clone.removeAttribute("contenteditable");
      clone.classList.remove("tt-editing");
      clone.style.margin = "0";
      clone.style.boxShadow = "none";
      clone.style.pageBreakAfter = i < sheets.length - 1 ? "always" : "auto";
      container.appendChild(clone);
    });
    document.body.appendChild(container);
    try {
      await window.html2pdf().set({
        margin: 0,
        filename: name + ".pdf",
        image: { type: "jpeg", quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "in", format: [widthIn, heightIn], orientation: widthIn > heightIn ? "landscape" : "portrait" }
      }).from(container).save();
    } finally {
      container.remove();
    }
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

  /* --------- SAVE AS to library --------- */
  function saveAs() {
    const warnings = checkUnfilledFields();
    if (warnings.length) {
      showUnfilledWarning(warnings, () => doSaveAs());
      return;
    }
    doSaveAs();
  }

  function doSaveAs() {
    const defaultName = baseFilename() + " — Copy";
    const name = prompt("Save this template as:", defaultName);
    if (!name || !name.trim()) return;

    // Clean DOM, absolute paths
    const clone = document.documentElement.cloneNode(true);
    clone.dataset.lprSnapshot = '1'; // tells employee.js not to overwrite baked-in values
    clone.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
    clone.querySelectorAll(".tt-editing").forEach(el => el.classList.remove("tt-editing"));
    const baseUrl = location.href.substring(0, location.href.lastIndexOf("/") + 1);
    clone.querySelectorAll("[src], [href]").forEach(el => {
      ["src", "href"].forEach(attr => {
        const v = el.getAttribute(attr);
        if (!v) return;
        if (/^(?:https?:|data:|blob:|mailto:|tel:|#|\/)/.test(v)) return;
        el.setAttribute(attr, baseUrl + v);
      });
    });
    const html = "<!DOCTYPE html>\n" + clone.outerHTML;

    const id = "c_" + Date.now().toString(36);
    const saved = JSON.parse(localStorage.getItem("lpr_custom_templates") || "{}");
    saved[id] = {
      id,
      name: name.trim(),
      html,
      base: location.pathname.split("/").pop(),
      savedAt: new Date().toISOString()
    };
    localStorage.setItem("lpr_custom_templates", JSON.stringify(saved));
    if (confirm('Saved "' + name + '" to your template library.\n\nGo back to the index now?')) {
      location.href = "index.html";
    }
  }
})();
