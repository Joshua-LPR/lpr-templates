/* ============================================================
   LPR Employee Field System
   ------------------------------------------------------------
   Reads URL params and replaces marked-up elements throughout
   any template that includes this script.

   Supported params:  ?name=...&title=...&phone=...&email=...
   Default values fall back to David Mitnick.

   Mark elements with:
     <span data-employee-field="name"></span>
     <a   data-employee-field="email"></a>      → also sets href="mailto:…"
     <a   data-employee-field="phone"></a>      → also sets href="tel:+1…"
     <span data-employee-field="firstName"></span>  (derived)
   ============================================================ */
(function () {
  const DEFAULTS = {
    name: "David Mitnick",
    title: "Senior Property Manager",
    phone: "443.402.5641",
    email: "david@lasalleparkrealty.com",
  };

  const params = new URLSearchParams(window.location.search);
  // Use param value if present (even empty string); otherwise fall back to default.
  const emp = {
    name:  params.has("name")  ? params.get("name")  : DEFAULTS.name,
    title: params.has("title") ? params.get("title") : DEFAULTS.title,
    phone: params.has("phone") ? params.get("phone") : DEFAULTS.phone,
    email: params.has("email") ? params.get("email") : DEFAULTS.email,
  };
  emp.firstName = emp.name.split(" ")[0];
  emp.phoneDigits = "+1" + emp.phone.replace(/\D/g, "");

  function apply() {
    // Saved snapshots have employee values baked into the DOM — don't overwrite them
    if (document.documentElement.dataset.lprSnapshot) return;
    document.querySelectorAll("[data-employee-field]").forEach(el => {
      const field = el.getAttribute("data-employee-field");
      const val = emp[field];
      if (val == null) return;
      el.textContent = val;
      if (el.tagName === "A" && field === "email") el.setAttribute("href", "mailto:" + emp.email);
      if (el.tagName === "A" && field === "phone") el.setAttribute("href", "tel:" + emp.phoneDigits);
    });
    // Hide whole containers when a referenced field is empty.
    document.querySelectorAll("[data-employee-hide-if-empty]").forEach(el => {
      const field = el.getAttribute("data-employee-hide-if-empty");
      if (emp[field] === "") el.style.display = "none";
    });

    // Drop the active user's signature image into any .signature placeholder.
    const sig = localStorage.getItem("lpr_signature");
    if (sig) {
      const file = (location.pathname.split("/").pop() || "default").toLowerCase();
      let off = null;
      try { off = JSON.parse(localStorage.getItem("lpr_sig_offset_" + file) || "null"); } catch (e) {}
      const tform = off ? "transform: translate(" + (off.x || 0) + "px, " + (off.y || 0) + "px); " : "";
      const widthCss = off && off.w
        ? "width: " + off.w + "px; max-width: " + off.w + "px; height: auto; max-height: none;"
        : "max-width: 2.4in;";
      document.querySelectorAll(".signature, .signature-slot").forEach(el => {
        if (el.querySelector("img.lpr-sig-img")) return;
        const h = el.offsetHeight || null;
        const heightCss = off && off.w ? "" : "max-height: " + (h ? (h + 8) + "px" : "0.7in") + ";";
        el.innerHTML = '<img class="lpr-sig-img" src="' + sig + '" alt="signature" style="' + widthCss + ' ' + heightCss + ' mix-blend-mode: multiply; display: block; ' + tform + '"/>';
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }

  // expose for debugging
  window.__lprEmployee = emp;
})();
