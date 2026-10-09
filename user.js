/* ============================================================
   LPR Multi-User System
   ------------------------------------------------------------
   Namespaces all localStorage keys starting with "lpr_" by
   the currently-active user. Loads BEFORE any other lpr_*
   storage access so the monkey-patching is in place first.

   Public API: window.LPR_USER
     .active           current user id (string|null)
     .activeName()     display name of active user
     .getUsers()       array of { id, name }
     .setUsers(arr)    save users list
     .setActive(id)    set the active user
     .clearActive()    log out
     .deleteUser(id)   wipe all data for a user
   ============================================================ */
/* ============================================================
   Shared helpers — window.LPR_UTIL
   ------------------------------------------------------------
   Small utilities every LPR script uses. They live HERE because
   user.js is the one script every page AND every saved Library
   copy loads first: a separate helpers file would be missing from
   copies saved before it existed, and their scripts would break.

   Page identity — three formulas ON PURPOSE. Saved settings are
   keyed by each exact one, so never "unify" them (people would
   silently lose saved data). URL-encoding is kept as-is
   (e.g. "Certificate%20of%20Mailing").
     pageFile()  raw last path segment       "Letterhead.html"
     pageBase()  minus .html (default page)  "Letterhead"        mode bar
     pageKey()   pageBase + Library id       "view_c_abc123"     fields, manual address
     fileKey()   lower-cased file (default)  "letterhead.html"   signature offsets/options

   Field tokens:
     TOKEN_ATTRS / TOKEN_SEL          every data-*-field token
     FILL_TOKEN_SEL                   fill-in tokens only (Print Blank
                                      clears these; sender/employee stay)
     spaceToken(el)                   add a space where a field touches a
                                      letter/digit/another field ("JaneDoe");
                                      none before punctuation or after "$".
                                      Returns the inserted text nodes.
     spaceAllTokens(root)             spaceToken for every field in root
     FIELDS                           THE field table: namespace → key → label
     makeToken(ns, key, fillLabel)    a new empty field span (all namespaces)
   ============================================================ */
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pageFile() { return location.pathname.split('/').pop(); }
  function pageBase() { return (pageFile() || 'page').replace(/\.html?$/i, ''); }
  function pageKey() {
    var base = pageBase();
    // Library copies (view.html?id=…) get their own bucket so saved
    // documents don't share field values.
    if (base === 'view') {
      var id = new URLSearchParams(location.search).get('id');
      var slug = id ? String(id).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') : '';
      if (slug) return base + '_' + slug;
    }
    return base;
  }
  function fileKey() { return (pageFile() || 'default').toLowerCase(); }

  var TOKEN_ATTRS = ['data-fill-field', 'data-tenant-field', 'data-contact-field',
                     'data-employee-field', 'data-owner-field', 'data-vendor-field'];
  var FILL_TOKEN_ATTRS = ['data-fill-field', 'data-contact-field', 'data-tenant-field', 'data-vendor-field'];
  function selectorFor(attrs) { return attrs.map(function (a) { return '[' + a + ']'; }).join(','); }
  var TOKEN_SEL = selectorFor(TOKEN_ATTRS);

  // THE field list — key → label per namespace. Insert Field, the Setup
  // tabs, the {{field key}} matcher and the legend (field-keys.js) are all
  // built from this one table. Order = display order (and tenant/vendor
  // CSV column order), so append, don't reorder.
  var FIELDS = {
    contact: {        // data-contact-field — the recipient (a tenant or vendor)
      first_name: 'First Name', last_name: 'Last Name', name: 'Recipient Name',
      address_line1: 'Street Address', address_line2: 'Address Line 2',
      city: 'City', state: 'State', zip: 'Zip', email: 'Email', phone: 'Phone'
    },
    tenant: {         // data-tenant-field — legacy alias; tenant-only data
      first_name: 'First Name', last_name: 'Last Name',
      address_line1: 'Street Address', address_line2: 'Address Line 2',
      city: 'City', state: 'State', zip: 'Zip',
      lease_start: 'Lease Start', lease_end: 'Lease End', rent_amount: 'Rent Amount',
      phone: 'Phone (Mobile)', phone2: 'Phone 2 (Home/Work)',
      email1: 'Email 1', email2: 'Email 2', dob: 'Date of Birth',
      landlord: 'Landlord'      // the owning entity, matched from the Properties CSV (tenants.js)
    },
    vendor: {         // data-vendor-field
      name: 'Vendor Name', address_line1: 'Street Address', address_line2: 'Address Line 2',
      city: 'City', state: 'State', zip: 'Zip',
      email1: 'Email (Primary)', email2: 'Email (Alternate)', phone: 'Work Phone', mobile: 'Mobile'
    },
    fill: { date: 'Date', time: 'Time', amount: 'Amount', text: 'Text' },   // data-fill-field (+ data-fill-label)
    owner: { name: 'Sender Company' },      // data-owner-field (Setup → Sender) — LPR signs as agent; NOT the tenant's landlord
    employee: { name: 'Signer Name', title: 'Signer Title', phone: 'Signer Phone', email: 'Signer Email' }  // data-employee-field
  };

  // A new (empty) field token. `fillLabel`: a fill-in's own label ("Payment
  // Due Date" — same label = same value); defaults to the type's label.
  function makeToken(ns, key, fillLabel) {
    var span = document.createElement('span');
    var label = (FIELDS[ns] || {})[key] || key;
    span.setAttribute('data-' + ns + '-field', key);
    if (ns === 'fill') {
      label = fillLabel || label;
      span.setAttribute('data-fill-label', label);
      span.setAttribute('data-fill-placeholder', label);
    } else if (ns === 'contact' || ns === 'tenant' || ns === 'vendor') {
      span.setAttribute('data-' + ns + '-label', label);
    }
    return span;
  }

  // What sits right next to a field, within its line: 'token' (another
  // field), the neighbouring character, or '' (line edge / nothing).
  var LINE_EDGE = /^(P|DIV|LI|H[1-6]|TD|TH|BR|UL|OL|TABLE)$/;
  function neighbour(el, dir) {
    for (var n = el; n; n = n.parentElement) {
      for (var sib = dir < 0 ? n.previousSibling : n.nextSibling; sib; sib = dir < 0 ? sib.previousSibling : sib.nextSibling) {
        if (sib.nodeType === 1) {
          if (sib.matches(TOKEN_SEL)) return 'token';
          // A styled element (has a class, e.g. TOPA's "Date: ____" line) is
          // laid out on purpose — never space against it.
          if (LINE_EDGE.test(sib.tagName) || sib.className) return '';
          if (!sib.textContent.trim() && sib.querySelector(TOKEN_SEL)) return 'token';   // <b><field></b>
        }
        var t = sib.nodeType === 1 || sib.nodeType === 3 ? sib.textContent : '';
        if (t.length) return dir < 0 ? t.slice(-1) : t.charAt(0);
      }
      if (!n.parentElement || LINE_EDGE.test(n.parentElement.tagName) || n.parentElement.classList.contains('sheet')) return '';
    }
    return '';
  }
  var needsSpace = function (c) { return c === 'token' || /[A-Za-z0-9À-ɏ]/.test(c); };
  function spaceToken(el) {
    var added = [];
    if (!el || !el.parentNode || (el.parentElement && el.parentElement.closest(TOKEN_SEL))) return added;
    if (needsSpace(neighbour(el, -1))) { added.push(el.parentNode.insertBefore(document.createTextNode(' '), el)); }
    if (needsSpace(neighbour(el, 1))) { added.push(el.parentNode.insertBefore(document.createTextNode(' '), el.nextSibling)); }
    return added;
  }
  // Visited in document order, so a field pair gets one space, not two.
  function spaceAllTokens(root) {
    var n = 0;
    (root || document).querySelectorAll(TOKEN_SEL).forEach(function (el) { n += spaceToken(el).length; });
    return n;
  }

  window.LPR_UTIL = {
    esc: esc,
    pageFile: pageFile, pageBase: pageBase, pageKey: pageKey, fileKey: fileKey,
    TOKEN_ATTRS: TOKEN_ATTRS.slice(),
    TOKEN_SEL: TOKEN_SEL,
    FILL_TOKEN_SEL: selectorFor(FILL_TOKEN_ATTRS),
    FIELDS: FIELDS,
    makeToken: makeToken,
    spaceToken: spaceToken,
    spaceAllTokens: spaceAllTokens
  };
})();

(function () {
  const USER_KEY  = "lpr_active_user";
  const USERS_KEY = "lpr_users";
  const NS_PREFIX = "lpr_user_";

  const realGet    = localStorage.getItem.bind(localStorage);
  const realSet    = localStorage.setItem.bind(localStorage);
  const realRemove = localStorage.removeItem.bind(localStorage);
  const realKey    = localStorage.key.bind(localStorage);

  const activeUser = realGet(USER_KEY);

  // Default users (used on first load if none have been added yet)
  const DEFAULT_USERS = [
    { id: "david",   name: "David Mitnick" },
    { id: "joshua",  name: "Joshua Schoemann" },
    { id: "sam",     name: "Sam Teitelman" }
  ];

  function getUsers() {
    try {
      const stored = JSON.parse(realGet(USERS_KEY) || "null");
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch (e) {}
    return DEFAULT_USERS.slice();
  }
  function setUsers(users) {
    realSet(USERS_KEY, JSON.stringify(users));
  }

  // Redirect to picker if no active user (except on the picker itself)
  const path = location.pathname.toLowerCase();
  const isPicker = path.endsWith("users.html");
  if (!activeUser && !isPicker) {
    location.href = "users.html";
    return;
  }

  // Build namespace for this user
  const NS = NS_PREFIX + (activeUser || "default") + "_";

  // System keys (not namespaced — shared across users)
  const GLOBAL = new Set([USER_KEY, USERS_KEY]);

  function shouldNS(key) {
    if (typeof key !== "string") return false;
    if (!key.startsWith("lpr_")) return false;
    if (GLOBAL.has(key)) return false;
    if (key.startsWith(NS_PREFIX)) return false; // already namespaced
    return true;
  }

  // Monkey-patch localStorage so every existing piece of code
  // that says localStorage.setItem("lpr_starred", ...) automatically
  // hits "lpr_user_<id>_lpr_starred" instead.
  localStorage.getItem    = function (k)    { return shouldNS(k) ? realGet(NS + k)    : realGet(k); };
  localStorage.setItem    = function (k, v) { return shouldNS(k) ? realSet(NS + k, v) : realSet(k, v); };
  localStorage.removeItem = function (k)    { return shouldNS(k) ? realRemove(NS + k) : realRemove(k); };

  function activeName() {
    const u = getUsers().find(u => u.id === activeUser);
    return u ? u.name : (activeUser || "Default");
  }

  function setActive(id) {
    if (id) realSet(USER_KEY, id);
    else realRemove(USER_KEY);
  }
  function clearActive() { realRemove(USER_KEY); }

  function deleteUser(id) {
    // Remove user entry
    const users = getUsers().filter(u => u.id !== id);
    setUsers(users);
    // Wipe all their namespaced keys
    const prefix = NS_PREFIX + id + "_";
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = realKey(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    toRemove.forEach(k => realRemove(k));
    // If we just deleted the active user, log out
    if (activeUser === id) clearActive();
  }

  window.LPR_USER = {
    active: activeUser,
    activeName,
    getUsers, setUsers,
    setActive, clearActive,
    deleteUser
  };

  /* ============================================================
     SCHEMA VERSIONING & MIGRATIONS
     ------------------------------------------------------------
     Runs after active-user resolution (above) so any migration's
     up() reads/writes through the already-patched localStorage
     and therefore lands in the active user's namespace. Ordered,
     idempotent: each up() must guard its own work so re-running
     it (e.g. cur already >= m.v) is a no-op. lpr_schema_version
     itself is namespaced like every other lpr_* key.
     ============================================================ */
  const LPR_SCHEMA_VERSION = 1;
  const LPR_MIGRATIONS = [
    // { v: 2, up() { /* e.g. copy lpr_addr_* legacy key -> canonical; relabel Date -> Notice Date */ } },
  ];
  function runMigrations() {
    let cur = parseInt(localStorage.getItem('lpr_schema_version') || '1', 10);
    for (const m of LPR_MIGRATIONS) {
      if (m.v > cur) {
        try { m.up(); } catch (e) { console.warn('migration', m.v, e); }
        cur = m.v;
      }
    }
    localStorage.setItem('lpr_schema_version', String(LPR_SCHEMA_VERSION));
  }
  runMigrations();
})();
