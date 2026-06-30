// Session persistence + lifecycle on top of chrome.storage.local.
import { STATE } from "./state.js";
import { DANGER } from "./theme.js";
import { flash } from "./utils.js";
import { buildMarkdownFrom } from "./markdown.js";
import { copyText } from "./clipboard.js";
import { addBadge, renumberBadges, repositionBadges } from "./badges.js";
import {
  updateCount,
  renderContent,
  openPanel,
  setView,
  locateFlag,
} from "./panel.js";
import { noteResume } from "./follow.js";

const STORE_KEY = "__flagger_store_v1";
// Where a cross-page "go to this flag" request is stashed across the navigation.
const LOCATE_KEY = "__flagger_locate";

export function hasStorage() {
  try {
    return !!(window.chrome && chrome.storage && chrome.storage.local);
  } catch (e) {
    return false;
  }
}
function defaultStore() {
  return { sessions: [], openId: null };
}
function defObj(k, v) {
  var o = {};
  o[k] = v;
  return o;
}

function loadStore(cb) {
  if (!hasStorage()) {
    cb(defaultStore());
    return;
  }
  try {
    chrome.storage.local.get(STORE_KEY, function (res) {
      var s = res && res[STORE_KEY];
      if (!s || !Array.isArray(s.sessions)) s = defaultStore();
      cb(s);
    });
  } catch (e) {
    cb(defaultStore());
  }
}
function saveStore() {
  if (!hasStorage() || !STATE.store) return;
  try {
    chrome.storage.local.set(defObj(STORE_KEY, STATE.store));
  } catch (e) {}
}

function genId() {
  return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function findSession(id) {
  if (!STATE.store) return null;
  for (var i = 0; i < STATE.store.sessions.length; i++) {
    if (STATE.store.sessions[i].id === id) return STATE.store.sessions[i];
  }
  return null;
}
function serializeFlags() {
  return STATE.flags.map(function (c) {
    return {
      id: c.id,
      url: c.url,
      selector: c.selector,
      summary: c.summary,
      x: c.x,
      y: c.y,
      text: c.text,
    };
  });
}

// Write the live flags into the open session, creating it on the first flag.
export function persist() {
  if (!STATE.store) return;
  var sess = STATE.sessionId ? findSession(STATE.sessionId) : null;
  if (!sess) {
    if (!STATE.flags.length) return; // don't create empty sessions
    sess = {
      id: genId(),
      title: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "open",
      copied: false,
      flags: [],
    };
    STATE.store.sessions.push(sess);
    STATE.sessionId = sess.id;
  }
  sess.flags = serializeFlags();
  sess.updatedAt = Date.now();
  sess.status = "open";
  STATE.store.openId = sess.id;
  saveStore();
  renderContent();
}

// Copy & Exit: the open session becomes a completed history entry.
export function finishSession() {
  if (!STATE.store || !STATE.sessionId) return;
  var sess = findSession(STATE.sessionId);
  if (sess) {
    sess.status = "done";
    sess.copied = true;
    sess.updatedAt = Date.now();
  }
  STATE.store.openId = null;
  STATE.sessionId = null;
  saveStore();
}

// Remember that we offered Follow for the open session, so it's offered at most
// once per session.
export function markFollowPrompted() {
  if (!STATE.store || !STATE.sessionId) return;
  var sess = findSession(STATE.sessionId);
  if (sess && !sess.followPrompted) {
    sess.followPrompted = true;
    saveStore();
  }
}

// Park the current open session (kept in history) and start a clean slate.
export function newSession() {
  if (STATE.sessionId) {
    var sess = findSession(STATE.sessionId);
    if (sess) {
      if (sess.flags && sess.flags.length) {
        sess.status = "done";
        sess.updatedAt = Date.now();
      } else {
        dropSession(sess.id);
      } // discard if it never got a flag
    }
  }
  STATE.store.openId = null;
  STATE.sessionId = null;
  clearFlagsUI();
  saveStore();
  setView("flags");
}

// Reopen a saved session: make it active and re-pin this page's flags.
export function reopenSession(id) {
  var target = findSession(id);
  if (!target) return;
  if (STATE.sessionId && STATE.sessionId !== id) {
    var cur = findSession(STATE.sessionId);
    if (cur) {
      if (cur.flags && cur.flags.length) cur.status = "done";
      else dropSession(cur.id);
    }
  }
  target.status = "open";
  target.updatedAt = Date.now();
  STATE.store.openId = id;
  STATE.sessionId = id;
  saveStore();
  clearFlagsUI();
  hydrate(target.flags);
  setView("flags");
  openPanel();
}

function dropSession(id) {
  if (!STATE.store) return;
  STATE.store.sessions = STATE.store.sessions.filter(function (s) {
    return s.id !== id;
  });
  if (STATE.store.openId === id) STATE.store.openId = null;
}
export function deleteSession(id) {
  dropSession(id);
  if (STATE.sessionId === id) {
    STATE.sessionId = null;
    clearFlagsUI();
  }
  saveStore();
  renderContent();
}

function clearFlagsUI() {
  Array.prototype.forEach.call(
    document.querySelectorAll(".__cmt_badge"),
    function (el) {
      el.remove();
    },
  );
  STATE.flags = [];
  updateCount();
  renderContent();
}

// Load a session's flags into STATE; re-pin badges for ones on this page.
function hydrate(flags) {
  STATE.flags = (flags || []).map(function (f) {
    return {
      id: f.id,
      el: null,
      url: f.url,
      selector: f.selector,
      summary: f.summary,
      x: f.x,
      y: f.y,
      text: f.text,
      badge: null,
    };
  });
  var maxId = 0;
  STATE.flags.forEach(function (c) {
    if (typeof c.id === "number" && c.id > maxId) maxId = c.id;
  });
  STATE.nextId = maxId + 1;
  STATE.flags.forEach(function (c) {
    if (c.url !== location.href) return;
    try {
      c.el = document.querySelector(c.selector);
    } catch (e) {
      c.el = null;
    }
    if (c.el) addBadge(c);
  });
  renumberBadges();
  repositionBadges();
  updateCount();
  renderContent();
}

export function initSessions() {
  loadStore(function (store) {
    STATE.store = store;
    var open = store.openId ? findSession(store.openId) : null;
    if (!open) {
      for (var i = 0; i < store.sessions.length; i++) {
        if (store.sessions[i].status === "open") {
          open = store.sessions[i];
          break;
        }
      }
    }
    if (open && STATE.flags.length === 0) {
      STATE.sessionId = open.id;
      STATE.store.openId = open.id;
      hydrate(open.flags);
      resolvePendingLocate(); // we may have navigated here to view a flag
      noteResume(
        (open.flags || []).some(function (f) {
          return f.url !== location.href;
        }),
        !!open.followPrompted,
      );
    } else if (STATE.flags.length) {
      persist(); // user flagged before storage finished loading
      noteResume(false, false);
    } else {
      noteResume(false, false);
    }
  });
}

// Go to a flag that lives on another page: stash the target, then navigate.
// When the overlay loads on that page (Follow re-injects it, or the user
// re-opens), resolvePendingLocate() scrolls to and highlights the flag.
export function navigateToFlag(c) {
  if (!c || !/^https?:\/\//i.test(c.url || "")) {
    flash("Can't open that page", DANGER);
    return;
  }
  var go = function () {
    try {
      location.assign(c.url);
    } catch (e) {
      location.href = c.url;
    }
  };
  if (!hasStorage()) {
    go();
    return;
  }
  try {
    // navigate only once the target is saved, so it survives the page change
    chrome.storage.local.set(
      defObj(LOCATE_KEY, { url: c.url, id: c.id, ts: Date.now() }),
      go,
    );
  } catch (e) {
    go();
  }
}

function resolvePendingLocate() {
  if (!hasStorage()) return;
  try {
    chrome.storage.local.get(LOCATE_KEY, function (res) {
      var p = res && res[LOCATE_KEY];
      if (!p) return;
      var stale = !p.ts || Date.now() - p.ts > 30000;
      if (p.url !== location.href || stale) {
        if (stale) chrome.storage.local.remove(LOCATE_KEY);
        return;
      }
      chrome.storage.local.remove(LOCATE_KEY);
      var target = null;
      for (var i = 0; i < STATE.flags.length; i++) {
        if (STATE.flags[i].id === p.id) {
          target = STATE.flags[i];
          break;
        }
      }
      if (target)
        setTimeout(function () {
          locateFlag(target);
        }, 150);
    });
  } catch (e) {}
}

// Copy a session straight from the history list — no need to open it.
export function quickCopy(session) {
  var md = buildMarkdownFrom(session.flags);
  if (!md) {
    flash("Session is empty", DANGER);
    return;
  }
  var n = session.flags.length;
  copyText(md, function (ok) {
    flash(
      ok ? "Copied " + n + " flag" + (n === 1 ? "" : "s") : "Copy failed",
      ok ? null : DANGER,
    );
  });
}
