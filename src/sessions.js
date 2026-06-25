// Session persistence + lifecycle on top of chrome.storage.local.
import { STATE } from "./state.js";
import { DANGER } from "./theme.js";
import { flash } from "./utils.js";
import { buildMarkdownFrom } from "./markdown.js";
import { copyText } from "./clipboard.js";
import { addBadge, renumberBadges, repositionBadges } from "./badges.js";
import { updateCount, renderPanel, openPanel } from "./panel.js";
import { closeHistory, renderHistory } from "./history.js";
import { noteResume } from "./follow.js";

const STORE_KEY = "__flagger_store_v1";

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
  if (STATE.historyOpen) renderHistory();
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
  flash("New session started");
  if (STATE.historyOpen) renderHistory();
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
  closeHistory();
  if (!STATE.panelOpen) openPanel();
  var pinned = STATE.flags.filter(function (c) {
    return c.badge;
  }).length;
  flash(
    "Reopened · " +
      STATE.flags.length +
      " flag" +
      (STATE.flags.length === 1 ? "" : "s") +
      (pinned ? " (" + pinned + " on this page)" : ""),
  );
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
  if (STATE.historyOpen) renderHistory();
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
  if (STATE.panelOpen) renderPanel();
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
  if (STATE.panelOpen) renderPanel();
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
      var n = open.flags ? open.flags.length : 0;
      if (n) flash("Resumed · " + n + " flag" + (n === 1 ? "" : "s"));
      noteResume(
        (open.flags || []).some(function (f) {
          return f.url !== location.href;
        }),
      );
    } else if (STATE.flags.length) {
      persist(); // user flagged before storage finished loading
      noteResume(false);
    } else {
      noteResume(false);
    }
  });
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
