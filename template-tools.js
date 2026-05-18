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
      s.classList.toggle("tt-editing", editing);
    });
    const btn = document.getElementById("tt-edit-btn");
    btn.textContent = editing ? "✓ Done editing" : "Edit";
    btn.classList.toggle("tt-active", editing);
  }

  /* --------- EXPORT --------- */
  async function doExport(kind) {
    const name = baseFilename();
    try {
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
    await ensureLib("https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js", "htmlToImage");
    const sheets = [...document.querySelectorAll(".sheet")];
    for (let i = 0; i < sheets.length; i++) {
      const blob = await window.htmlToImage.toBlob(sheets[i], {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true
      });
      const suffix = sheets.length > 1 ? "-" + (i + 1) : "";
      triggerDownload(blob, name + suffix + ".png");
      await new Promise(r => setTimeout(r, 250));
    }
  }

  async function exportPdf(name) {
    await ensureLib("https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js", "html2pdf");
    const sheets = [...document.querySelectorAll(".sheet")];
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
    const defaultName = baseFilename() + " — Copy";
    const name = prompt("Save this template as:", defaultName);
    if (!name || !name.trim()) return;

    // Clean DOM, absolute paths
    const clone = document.documentElement.cloneNode(true);
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
