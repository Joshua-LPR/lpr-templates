/* ============================================================
   field-keys.js — {{field keys}} → live fields, + the key legend

   Type or paste {{first name}}, {{date: Payment Due Date}}, {{landlord}}
   … in Edit mode: pasted keys convert at once (a LPR_PASTE transform),
   typed ones on Done (template-tools calls convertSheets). Spelling is
   forgiving ({{First_Name}} = {{firstname}}). A key inside bold / italic /
   underline stays inside it, so the field keeps that formatting through
   filling, Save As and export. Unknown keys are highlighted and listed —
   never dropped.

   The key table, the matcher and the legend (Copy / Download .txt, and
   FIELD-KEYS.md via tests/keys.test.mjs --write) are all built from
   LPR_UTIL.FIELDS (user.js) — never a hand-copied list.

   Loaded by template-tools.js (ensureLib) and by index.html.
   ============================================================ */
(function () {
  if (window.LPR_KEYS) return;
  var U = window.LPR_UTIL, F = U.FIELDS;
  var KEY_RE = /\{\{\s*([^{}]*?)\s*\}\}/g;
  var FILL_RE = /^(date|time|amount|text)\s*(?::\s*(.*))?$/i;
  var NSWORD = { contact: 'recipient', tenant: 'tenant', vendor: 'vendor', owner: 'sender', employee: 'signer' };

  function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function words(label) { return label.replace(/\([^)]*\)/g, '').replace(/[\/]/g, ' ').trim().toLowerCase().replace(/\s+/g, ' '); }

  /* ---- the key table ---------------------------------------- */
  // { name (as shown in the legend), group, ns, field | preset, aliases }
  var ENTRIES = [], LOOKUP = {};
  function add(group, name, target, extra) {
    var e = { name: name, group: group, ns: target.ns, field: target.field, preset: target.preset };
    ENTRIES.push(e);
    [name].concat(extra || []).forEach(function (a) { var k = norm(a); if (k && !(k in LOOKUP)) LOOKUP[k] = e; });
  }
  // `bare`: may the key be written without its namespace word? Only where
  // nothing else shares the name. Recipient keys are bare (they fill from
  // the tenant OR vendor picked as recipient); vendor and signer keys never
  // are, so {{phone}} can't silently become the vendor's or signer's phone.
  function addNs(group, ns, keys, prefix, bare) {
    var shown = {};
    keys.forEach(function (k) {
      var label = F[ns][k], name = words(label);
      if (prefix && name.indexOf(prefix + ' ') !== 0) name = prefix + ' ' + name;      // "vendor city", not "vendor vendor name"
      if (shown[name]) name = (prefix && label.toLowerCase().indexOf(prefix) !== 0 ? prefix + ' ' : '') +
                              label.toLowerCase().replace(/[()\/]/g, ' ').replace(/\s+/g, ' ').trim();   // "vendor email alternate"
      shown[name] = true;
      add(group, name, { ns: ns, field: k }, (bare ? [k, label] : []).concat([NSWORD[ns] + k, NSWORD[ns] + label]));
    });
  }
  var G_REC = 'Recipient — the tenant OR vendor the letter is addressed to';
  var G_TEN = 'Tenant only';
  addNs(G_REC, 'contact', Object.keys(F.contact), '', true);
  add(G_REC, 'full address', { ns: 'contact', preset: 'full_address' }, ['recipient full address', 'address']);
  // Tenant fields the recipient doesn't have (lease, rent…) — no clash, so no prefix needed.
  addNs(G_TEN, 'tenant', Object.keys(F.tenant).filter(function (k) { return !(k in F.contact); }), '', true);
  add(G_TEN, 'tenant full address', { ns: 'tenant', preset: 'full_address' });
  // Shared names forced to the tenant list: {{tenant first name}}, {{tenant city}}… (listed as one line).
  Object.keys(F.tenant).filter(function (k) { return k in F.contact; }).forEach(function (k) {
    var e = { ns: 'tenant', field: k };
    ['tenant' + k, 'tenant' + F.tenant[k]].forEach(function (a) { if (!(norm(a) in LOOKUP)) LOOKUP[norm(a)] = e; });
  });
  // {{landlord}} is the TENANT's landlord (tenant-only field above); the
  // company signing the letter (LPR as agent) is {{sender company}}.
  add('Sender', 'sender company', { ns: 'owner', field: 'name' }, ['company', 'sender']);
  addNs('Sender', 'employee', Object.keys(F.employee), '', false);
  addNs('Vendor — always starts with "vendor"', 'vendor', Object.keys(F.vendor), 'vendor', false);

  function resolve(raw) {
    var m = FILL_RE.exec(raw.trim());
    if (m) return { ns: 'fill', field: m[1].toLowerCase(), fillLabel: (m[2] || '').trim() || F.fill[m[1].toLowerCase()] };
    return LOOKUP[norm(raw)] || null;
  }

  /* ---- building fields --------------------------------------- */
  // "123 Main St, Apt 2, Baltimore, MD 21215" — the ", Apt 2" part hides
  // when address line 2 is empty (CSS below; screen, print and PDF).
  function fullAddress(ns) {
    var t = function (k) { return U.makeToken(ns, k); };
    var w = document.createElement('span'); w.className = 'lpr-full-addr';
    var p2 = document.createElement('span'); p2.className = 'lpr-addr2-part';
    p2.append(', ', t('address_line2'));
    w.append(t('address_line1'), p2, ', ', t('city'), ', ', t('state'), ' ', t('zip'));
    return w;
  }
  function build(r) {
    if (r.preset === 'full_address') return fullAddress(r.ns);
    return U.makeToken(r.ns, r.field, r.fillLabel);
  }
  function tokensOf(el) { return el.matches(U.TOKEN_SEL) ? [el] : [].slice.call(el.querySelectorAll(U.TOKEN_SEL)); }

  // A new field copies its value from a filled twin already on the page
  // (recipient picked before the paste, sender, signer…).
  function fillFromPage(tok) {
    var attr = U.TOKEN_ATTRS.filter(function (a) { return tok.hasAttribute(a); })[0];
    if (!attr) return;
    var sel = '[' + attr + '="' + tok.getAttribute(attr) + '"]';
    if (attr === 'data-fill-field') sel += '[data-fill-label="' + (tok.getAttribute('data-fill-label') || '').replace(/"/g, '\\"') + '"]';
    var twin = [].find.call(document.querySelectorAll(sel), function (x) { return x !== tok && x.textContent.trim(); });
    if (twin) tok.textContent = twin.textContent;
  }

  // Replace every {{key}} in root's text. Returns { made, unknown }.
  function convert(root, lock) {
    var found = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      var host = n.parentElement;
      if (host && host.closest(U.TOKEN_SEL + ',script,style,textarea,.lpr-key-unknown')) continue;
      KEY_RE.lastIndex = 0;
      if (KEY_RE.test(n.data)) found.push(n);
    }
    var made = [], unknown = [];
    found.forEach(function (node) {
      var frag = document.createDocumentFragment(), text = node.data, last = 0, m;
      KEY_RE.lastIndex = 0;
      while ((m = KEY_RE.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var r = resolve(m[1]), el;
        if (r) { el = build(r); made.push(el); }
        else {
          el = document.createElement('mark'); el.className = 'lpr-key-unknown';
          el.title = 'Unknown field key — see the field-key legend'; el.textContent = m[0];
          unknown.push(m[0]);
        }
        frag.appendChild(el);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
    made.forEach(function (el) {
      U.spaceToken(el);
      tokensOf(el).forEach(function (t) { fillFromPage(t); if (lock) t.setAttribute('contenteditable', 'false'); });
    });
    return { made: made, unknown: unknown };
  }

  // Done (template-tools): typed keys in every sheet.
  function convertSheets(sheets) {
    var made = [], unknown = [];
    sheets.forEach(function (s) { var r = convert(s, false); made = made.concat(r.made); unknown = unknown.concat(r.unknown); });
    afterConvert(made, unknown);
  }
  // Re-apply the Fields tab ONLY when a new fill-in was made (as Insert
  // Field does) — a blanket re-apply would wipe values set any other way.
  function afterConvert(made, unknown) {
    if (window.LPR_FILL_APPLY && made.some(function (el) { return tokensOf(el).some(function (t) { return t.hasAttribute('data-fill-field'); }); })) setTimeout(window.LPR_FILL_APPLY, 0);
    if (unknown.length) note('Unknown field ' + (unknown.length > 1 ? 'keys' : 'key') + ' left as text (highlighted): ' +
      unknown.filter(function (x, i) { return unknown.indexOf(x) === i; }).join(', ') + '. Check the spelling against the field-key legend.');
  }

  // Paste: keys in the clipboard become fields before insertion.
  function pasteTransform(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    var r = convert(d, !!document.querySelector('.sheet.tt-editing'));
    if (r.made.length || r.unknown.length) afterConvert(r.made, r.unknown);
    return d.innerHTML;
  }

  /* ---- legend + AI instructions ------------------------------- */
  function legendText() {
    var groups = [], by = {};
    ENTRIES.forEach(function (e) { if (!by[e.group]) { by[e.group] = []; groups.push(e.group); } by[e.group].push(e); });
    var L = [];
    L.push('LPR TEMPLATES — FIELD KEYS');
    L.push('==========================');
    L.push('');
    L.push('Put these keys in a letter where a name, address, date or amount belongs.');
    L.push('Paste the letter into a template in Edit mode (or type the keys and click');
    L.push('Done): every key becomes a live field that fills in from the recipient,');
    L.push('tenant, sender and Fields tab. Spelling is forgiving — {{first name}},');
    L.push('{{First_Name}} and {{firstname}} all work. A key the templates don\'t');
    L.push('know is highlighted, never dropped.');
    L.push('');
    L.push('FORMATTING CARRIES OVER');
    L.push('-----------------------');
    L.push('Format the KEY and the filled-in value gets the same formatting:');
    L.push('  **{{landlord}}**              -> the landlord\'s name in bold');
    L.push('  *{{date: Move-out Date}}*     -> that date in italics');
    L.push('  ***{{amount: Balance Due}}*** -> bold + italic');
    L.push('In rich text (Word, Google Docs, an AI chat\'s formatted answer) bold,');
    L.push('italic and underline all carry over. In plain text use Markdown: **bold**');
    L.push('and *italic* (plain text has no underline).');
    L.push('');
    L.push('SAME NAME, DIFFERENT PERSON');
    L.push('---------------------------');
    L.push('Names, addresses, phones and emails exist for the recipient, a tenant and a');
    L.push('vendor. A key with no prefix ({{first name}}, {{city}}, {{phone}}) is the');
    L.push('RECIPIENT — whoever the letter is addressed to, tenant or vendor. To name a');
    L.push('specific one, start the key with "tenant" or "vendor": {{tenant first name}},');
    L.push('{{vendor phone}}. Vendor keys only work with the "vendor" prefix, and the');
    L.push('person signing is always {{signer …}}.');
    L.push('');
    groups.forEach(function (g) {
      L.push(g.toUpperCase());
      L.push(new Array(g.length + 1).join('-'));
      by[g].forEach(function (e) {
        var key = '{{' + e.name + '}}';
        var what = e.preset ? (e.ns === 'tenant' ? "the tenant's address on one line: 123 Main St, Apt 2, Baltimore, MD 21215 (\", Apt 2\" only when there is one)"
                                                  : 'address on one line: 123 Main St, Apt 2, Baltimore, MD 21215 (", Apt 2" only when there is one)')
                            : F[e.ns][e.field];
        L.push('  ' + (key + '                              ').slice(0, 30) + ' ' + what);
      });
      L.push('');
    });
    L.push('FILL-IN BLANKS (you choose the label)');
    L.push('-------------------------------------');
    L.push('  {{date: Payment Due Date}}     a date');
    L.push('  {{amount: Back Rent Owed}}     a dollar amount (write the $ before it: ${{amount: …}})');
    L.push('  {{time: Inspection Time}}      a time');
    L.push('  {{text: Unit Number}}          any short text');
    L.push('The label is what the Fields tab asks for. The same label used twice is the');
    L.push('same value (fill it once, it appears everywhere).');
    L.push('');
    L.push('INSTRUCTIONS FOR AN AI DRAFTING A LETTER');
    L.push('----------------------------------------');
    L.push('You are drafting the BODY of a letter for LPR Management. It will be pasted');
    L.push('into a letterhead template that already has the logo, our address, the date');
    L.push('line, the recipient\'s address block, the sign-off and the signature.');
    L.push('1. Wherever a name, address, date, amount or other blank belongs, write the');
    L.push('   matching {{key}} from this list instead of a value. Never invent names,');
    L.push('   addresses, dates or amounts.');
    L.push('2. For a blank that is not in the list, use a fill-in key with a clear label:');
    L.push('   {{date: …}}, {{amount: …}}, {{time: …}} or {{text: …}}. Reuse the exact same');
    L.push('   label when the same value appears again.');
    L.push('3. To make a filled-in value bold or italic, format the KEY itself:');
    L.push('   **{{rent amount}}** gives the rent in bold, *{{date: Move-out Date}}* gives');
    L.push('   the date in italics. Don\'t put the formatting inside the braces.');
    L.push('4. Formatting you may use: **bold**, *italic*, numbered lists (1.), bullet');
    L.push('   lists (-), and headings (#) for section titles. No tables, colours or fonts.');
    L.push('5. Start with the salutation (Dear {{first name}} {{last name}},) and end with');
    L.push('   the last body paragraph. Do NOT write a date line, the recipient\'s address,');
    L.push('   a closing ("Sincerely"), a signature or the sender\'s name — the template');
    L.push('   adds those.');
    L.push('6. Write keys exactly with double curly braces: {{first name}}.');
    return L.join('\n') + '\n';
  }

  function copyLegend() {
    var t = legendText();
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return fallbackCopy(t); });
    return Promise.resolve(fallbackCopy(t));
  }
  function fallbackCopy(t) {
    var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove(); return ok;
  }
  function downloadLegend() {
    var url = URL.createObjectURL(new Blob([legendText()], { type: 'text/plain' }));
    var a = document.createElement('a'); a.href = url; a.download = 'LPR field keys.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  // Two buttons that copy / download the legend (Insert Field panel, index page).
  function legendButtons(cls) {
    var box = document.createElement('div'); box.className = 'lpr-keys-btns';
    box.innerHTML = '<button type="button" class="' + (cls || '') + '" data-keys="copy" title="Copy the field keys + AI instructions">Copy field keys</button>' +
                    '<button type="button" class="' + (cls || '') + '" data-keys="download" title="Download the field keys + AI instructions as a .txt file">Download .txt</button>';
    box.addEventListener('mousedown', function (e) { if (e.target.closest('[data-keys]')) e.preventDefault(); });   // keep the editing caret
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-keys]'); if (!b) return;
      if (b.dataset.keys === 'download') return downloadLegend();
      copyLegend().then(function (ok) { var o = b.textContent; b.textContent = ok ? '✓ Copied' : 'Copy failed'; setTimeout(function () { b.textContent = o; }, 1500); });
    });
    return box;
  }

  /* ---- notice + CSS -------------------------------------------- */
  function note(msg) {
    var n = document.getElementById('lpr-keys-note');
    // .no-print: the HTML export drops it
    if (!n) { n = document.createElement('div'); n.id = 'lpr-keys-note'; n.className = 'lpr-keys-note no-print'; document.body.appendChild(n); }
    n.textContent = msg;
    clearTimeout(n._t);
    n._t = setTimeout(function () { n.remove(); }, 9000);
  }
  if (!document.getElementById('lpr-keys-css')) {
    var st = document.createElement('style');
    st.id = 'lpr-keys-css';
    // On-screen notice only — the full-address and unknown-key rules live in
    // brand.css (exports strip this style and all scripts).
    st.textContent =
      '.lpr-keys-note { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); max-width: 560px; z-index: 10000;' +
      '  background: #0e1430; color: #fff; font: 13px/1.5 Montserrat, sans-serif; padding: 10px 16px; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,.25); }' +
      '@media print { .lpr-keys-note { display: none; } }';
    document.head.appendChild(st);
  }

  window.LPR_KEYS = {
    resolve: resolve, convert: convert, convertSheets: convertSheets, fullAddress: fullAddress,
    legendText: legendText, copyLegend: copyLegend, downloadLegend: downloadLegend, legendButtons: legendButtons,
    entries: function () { return ENTRIES.slice(); }
  };
  if (window.LPR_PASTE) window.LPR_PASTE.transforms.push(pasteTransform);
})();
