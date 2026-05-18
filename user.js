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
    { id: "joshua",  name: "Joshua Schoemann" }
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
})();
