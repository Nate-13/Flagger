// Overlay shell: toolbar, page event handlers, copy/exit, and teardown.
import { STATE } from "./state.js";
import { ICON } from "./icons.js";
import { DANGER } from "./theme.js";
import { flash } from "./utils.js";
import { injectStyles } from "./styles.js";
import { buildMarkdown } from "./markdown.js";
import { copyText } from "./clipboard.js";
import { repositionBadges } from "./badges.js";
import { togglePanel, repositionOpenBoxes } from "./panel.js";
import { toggleHistory } from "./history.js";
import { selectElement, closePopup } from "./flags.js";
import { finishSession, hasStorage, initSessions } from "./sessions.js";

// ---------------------------------------------------------------- drag
function onDragStart(e) {
  if (e.target.closest("button")) return;
  if (e.button !== 0) return;
  var toolbar = STATE.toolbar;
  var rect = toolbar.getBoundingClientRect();
  STATE.dragging = true;
  STATE.dragOffX = e.clientX - rect.left;
  STATE.dragOffY = e.clientY - rect.top;
  toolbar.style.left = rect.left + "px";
  toolbar.style.top = rect.top + "px";
  toolbar.style.right = "auto";
  toolbar.classList.add("__cmt_dragging");
  e.preventDefault();
}
function onDragMove(e) {
  if (!STATE.dragging) return;
  var toolbar = STATE.toolbar;
  var x = e.clientX - STATE.dragOffX;
  var y = e.clientY - STATE.dragOffY;
  var maxX = window.innerWidth - toolbar.offsetWidth;
  var maxY = window.innerHeight - toolbar.offsetHeight;
  toolbar.style.left = Math.max(0, Math.min(maxX, x)) + "px";
  toolbar.style.top = Math.max(0, Math.min(maxY, y)) + "px";
  repositionOpenBoxes();
}
function onDragEnd() {
  if (!STATE.dragging) return;
  STATE.dragging = false;
  STATE.toolbar.classList.remove("__cmt_dragging");
}

// ------------------------------------------------------- click capture
function isOurUI(el) {
  if (!el || !el.closest) return false;
  return !!(
    el.closest("#__cmt_toolbar") ||
    el.closest("#__cmt_popup") ||
    el.closest(".__cmt_panel") ||
    el.closest(".__cmt_badge") ||
    el.closest("#__cmt_flash")
  );
}
function onMouseOver(e) {
  if (STATE.dragging || STATE.popup) return;
  if (STATE.paused) {
    if (STATE.hoverEl) {
      STATE.hoverEl.classList.remove("__cmt_outline");
      STATE.hoverEl = null;
    }
    return;
  }
  if (isOurUI(e.target)) {
    if (STATE.hoverEl) {
      STATE.hoverEl.classList.remove("__cmt_outline");
      STATE.hoverEl = null;
    }
    return;
  }
  if (STATE.hoverEl) STATE.hoverEl.classList.remove("__cmt_outline");
  STATE.hoverEl = e.target;
  STATE.hoverEl.classList.add("__cmt_outline");
}
function onMouseOut(e) {
  if (e.target && e.target.classList)
    e.target.classList.remove("__cmt_outline");
}
function onClick(e) {
  if (STATE.dragging) return;
  if (STATE.paused) return; // browsing: let the click reach the page untouched
  if (isOurUI(e.target)) return;
  if (STATE.popup) return;
  e.preventDefault();
  e.stopPropagation();
  selectElement(e.target, e.clientX, e.clientY);
}
function onScroll() {
  repositionBadges();
  repositionOpenBoxes();
}
function onResize() {
  repositionBadges();
  repositionOpenBoxes();
}

// ---------------------------------------------------- pause / browse mode
export function togglePause() {
  setPaused(!STATE.paused);
}

function setPaused(paused) {
  STATE.paused = paused;
  var btn = document.getElementById("__cmt_pause");
  if (paused) {
    closePopup(); // can't be mid-flag while browsing
    if (STATE.hoverEl) {
      STATE.hoverEl.classList.remove("__cmt_outline");
      STATE.hoverEl = null;
    }
    STATE.toolbar.classList.add("__cmt_paused");
    if (btn) {
      btn.classList.add("primary");
      btn.innerHTML = ICON.play + " Resume";
      btn.title = "Resume flagging (Alt+Shift+P)";
    }
    flash("Browsing — click Resume to flag");
  } else {
    STATE.toolbar.classList.remove("__cmt_paused");
    if (btn) {
      btn.classList.remove("primary");
      btn.innerHTML = ICON.pause + " Pause";
      btn.title = "Pause flagging — interact with the page (Alt+Shift+P)";
    }
    flash("Flagging resumed");
  }
}

function onKeyDown(e) {
  // Alt+Shift+P toggles browse/flag. Ignore while typing in a field.
  if (!(e.altKey && e.shiftKey) || e.code !== "KeyP") return;
  var ae = document.activeElement;
  if (
    ae &&
    (ae.isContentEditable || /^(input|textarea|select)$/i.test(ae.tagName))
  )
    return;
  e.preventDefault();
  togglePause();
}

// ---------------------------------------------------- output + cleanup
export function copyAndExit() {
  if (STATE.exiting) return;
  var md = buildMarkdown();
  if (!md) {
    cleanup();
    return;
  }
  var n = STATE.flags.length;
  var done = function (ok) {
    if (!ok) {
      flash("Copy failed", DANGER);
      setTimeout(cleanup, 300);
      return;
    }
    STATE.exiting = true;
    finishSession();
    var label =
      ICON.check + " Copied " + n + " flag" + (n === 1 ? "" : "s") + "!";
    ["__cmt_copy", "__cmt_panel_copy"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.classList.add("__cmt_success");
      btn.innerHTML = label;
    });
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
    if (STATE.hoverEl) {
      STATE.hoverEl.classList.remove("__cmt_outline");
      STATE.hoverEl = null;
    }
    setTimeout(function () {
      if (STATE.toolbar) STATE.toolbar.classList.add("__cmt_exiting");
      if (STATE.panel) STATE.panel.classList.add("__cmt_exiting");
      if (STATE.history) STATE.history.classList.add("__cmt_exiting");
      if (STATE.popup) STATE.popup.classList.add("__cmt_exiting");
      Array.prototype.forEach.call(
        document.querySelectorAll(".__cmt_badge"),
        function (el) {
          el.classList.add("__cmt_exiting");
        },
      );
    }, 550);
    setTimeout(cleanup, 900);
  };
  copyText(md, done);
}

export function confirmCancel() {
  // The session is auto-saved to history, so closing is non-destructive.
  // Only warn if storage is unavailable and flags would actually be lost.
  if (
    !hasStorage() &&
    STATE.flags.length &&
    !confirm("Discard " + STATE.flags.length + " flag(s) and exit?")
  )
    return;
  cleanup();
}

export function cleanup() {
  document.removeEventListener("mouseover", onMouseOver, true);
  document.removeEventListener("mouseout", onMouseOut, true);
  document.removeEventListener("click", onClick, true);
  document.removeEventListener("keydown", onKeyDown, true);
  document.removeEventListener("mousemove", onDragMove);
  document.removeEventListener("mouseup", onDragEnd);
  window.removeEventListener("scroll", onScroll, true);
  window.removeEventListener("resize", onResize);
  Array.prototype.forEach.call(
    document.querySelectorAll(".__cmt_outline"),
    function (el) {
      el.classList.remove("__cmt_outline");
    },
  );
  Array.prototype.forEach.call(
    document.querySelectorAll(".__cmt_selected"),
    function (el) {
      el.classList.remove("__cmt_selected");
    },
  );
  Array.prototype.forEach.call(
    document.querySelectorAll(".__cmt_badge"),
    function (el) {
      el.remove();
    },
  );
  if (STATE.toolbar && STATE.toolbar.parentNode) STATE.toolbar.remove();
  if (STATE.popup) STATE.popup.remove();
  if (STATE.panel) STATE.panel.remove();
  if (STATE.history) STATE.history.remove();
  if (STATE.style && STATE.style.parentNode) STATE.style.remove();
  delete window.__flaggerActive;
}

// Build the toolbar, wire all listeners, and load the open session.
export function mount() {
  injectStyles();

  var toolbar = document.createElement("div");
  toolbar.id = "__cmt_toolbar";
  toolbar.innerHTML =
    '<span class="grip" title="Drag to move">' +
    ICON.grip +
    "</span>" +
    '<button id="__cmt_pause" title="Pause flagging — interact with the page (Alt+Shift+P)">' +
    ICON.pause +
    " Pause</button>" +
    '<button id="__cmt_history">' +
    ICON.history +
    " History</button>" +
    '<button id="__cmt_view">' +
    ICON.flag +
    ' Flags <span class="pill empty" id="__cmt_count_label">0</span></button>' +
    '<button id="__cmt_copy" class="primary">' +
    ICON.copy +
    " Copy &amp; Exit</button>" +
    '<button id="__cmt_cancel" class="icon-only" title="Close (your session is saved to history)">' +
    ICON.close +
    "</button>";
  document.body.appendChild(toolbar);
  STATE.toolbar = toolbar;

  document.getElementById("__cmt_pause").addEventListener("click", togglePause);
  document
    .getElementById("__cmt_history")
    .addEventListener("click", toggleHistory);
  document.getElementById("__cmt_view").addEventListener("click", togglePanel);
  document.getElementById("__cmt_copy").addEventListener("click", copyAndExit);
  document
    .getElementById("__cmt_cancel")
    .addEventListener("click", confirmCancel);

  toolbar.addEventListener("mousedown", onDragStart);
  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd);
  document.addEventListener("mouseover", onMouseOver, true);
  document.addEventListener("mouseout", onMouseOut, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);

  initSessions();
}
