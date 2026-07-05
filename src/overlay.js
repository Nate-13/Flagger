// Overlay shell: the morphing "island" control, page event handlers,
// copy/exit, and teardown.
//
// The island is one surface anchored bottom-right. At rest it's a small pill
// (flag + count). Hovering reveals Pause in the bottom-right corner; clicking
// Pause collapses to a browsing state. Lingering instead grows the pill into a
// card (flags list + actions) — and the Pause corner never moves, so it stays
// one click away the whole time.
import { STATE } from "./state.js";
import { ICON } from "./icons.js";
import { flash } from "./utils.js";
import { injectStyles } from "./styles.js";
import { buildMarkdown } from "./markdown.js";
import { copyText } from "./clipboard.js";
import { repositionBadges, closeComment } from "./badges.js";
import { openPanel, closePanel, renderContent } from "./panel.js";
import { toggleHistory } from "./history.js";
import { selectElement, closePopup } from "./flags.js";
import { finishSession, hasStorage, initSessions } from "./sessions.js";
import { initFollow, teardownFollow } from "./follow.js";
import { installProbe, teardownProbe } from "./detect.js";

var dwellTimer = null;
var leaveTimer = null;
var armTimer = null;
var dragStartX = 0,
  dragStartY = 0,
  dragRight = 0,
  dragBottom = 0;

// ------------------------------------------------------- click capture
function isOurUI(el) {
  if (!el || !el.closest) return false;
  return !!(
    el.closest("#__cmt_island") ||
    el.closest("#__cmt_popup") ||
    el.closest(".__cmt_badge") ||
    el.closest("#__cmt_flash") ||
    el.closest("#__cmt_modal_backdrop")
  );
}
function clearHover() {
  if (STATE.hoverEl) {
    STATE.hoverEl.classList.remove("__cmt_outline");
    STATE.hoverEl = null;
  }
}
function onMouseOver(e) {
  if (STATE.popup || STATE.dragging) return;
  if (STATE.paused || isOurUI(e.target)) {
    clearHover();
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
  if (isOurUI(e.target)) return; // our UI (island, popup, pins) handles its own clicks
  if (STATE.commentOpen != null) {
    // a comment bubble is open → a click away dismisses it (don't also flag)
    closeComment();
    if (STATE.paused) return;
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  if (STATE.paused) return; // browsing: let the click reach the page untouched
  if (STATE.pinned) {
    // a card opened programmatically stays until you click away to dismiss it
    e.preventDefault();
    e.stopPropagation();
    closePanel();
    return;
  }
  if (STATE.popup) return;
  e.preventDefault();
  e.stopPropagation();
  selectElement(e.target, e.clientX, e.clientY);
}
function onScroll() {
  repositionBadges();
}
function onResize() {
  repositionBadges();
}

// ---------------------------------------------------- hover ⇄ expand
function onIslandEnter() {
  clearTimeout(leaveTimer);
  if (STATE.closeArmed) {
    clearTimeout(armTimer); // hovering keeps the close affordance up; don't expand
    return;
  }
  STATE.hot = true;
  STATE.island.classList.add("__cmt_hot");
  dwellTimer = setTimeout(openPanel, 300); // linger to grow the card
}
function onIslandLeave() {
  if (STATE.dragging) return; // stay open while being dragged
  clearTimeout(dwellTimer);
  if (STATE.closeArmed) {
    clearTimeout(armTimer); // re-start the disarm countdown once you leave it
    armTimer = setTimeout(disarmClose, 2000);
    return;
  }
  if (STATE.pinned) return; // pinned cards wait for a click-away
  leaveTimer = setTimeout(function () {
    STATE.hot = false;
    STATE.island.classList.remove("__cmt_hot");
    closePanel();
  }, 240);
}

// ---------------------------------------------------- quick close (Esc)
// Esc arms this: the pill extends left to reveal a ✕. Esc again (or clicking it)
// closes; otherwise it disarms and collapses back on its own.
function armClose() {
  if (STATE.open) {
    closePanel();
    STATE.island.classList.remove("__cmt_hot");
    STATE.hot = false;
  }
  clearTimeout(dwellTimer);
  STATE.closeArmed = true;
  STATE.island.classList.add("__cmt_armed");
  clearTimeout(armTimer);
  armTimer = setTimeout(disarmClose, 3500);
}
function disarmClose() {
  clearTimeout(armTimer);
  STATE.closeArmed = false;
  if (STATE.island) STATE.island.classList.remove("__cmt_armed");
}

// ---------------------------------------------------- drag to reposition
// Drag the open card by its header to move the whole island. It stays anchored
// by right/bottom, so the morph keeps growing up-and-left from wherever it sits;
// the clamp keeps the expanded card on screen.
function onHeaderDown(e) {
  if (e.button !== 0 || (e.target.closest && e.target.closest("button")))
    return;
  var r = STATE.island.getBoundingClientRect();
  dragRight = window.innerWidth - r.right;
  dragBottom = window.innerHeight - r.bottom;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  STATE.dragging = true;
  STATE.island.classList.add("__cmt_dragging");
  document.addEventListener("mousemove", onDragMove, true);
  document.addEventListener("mouseup", onDragEnd, true);
  e.preventDefault();
}
function onDragMove(e) {
  if (!STATE.dragging) return;
  var isl = STATE.island;
  var right = dragRight - (e.clientX - dragStartX);
  var bottom = dragBottom - (e.clientY - dragStartY);
  right = Math.max(8, Math.min(right, window.innerWidth - isl.offsetWidth - 8));
  bottom = Math.max(
    8,
    Math.min(bottom, window.innerHeight - isl.offsetHeight - 8),
  );
  isl.style.right = right + "px";
  isl.style.bottom = bottom + "px";
}
function onDragEnd() {
  if (!STATE.dragging) return;
  STATE.dragging = false;
  STATE.island.classList.remove("__cmt_dragging");
  document.removeEventListener("mousemove", onDragMove, true);
  document.removeEventListener("mouseup", onDragEnd, true);
  if (!STATE.island.matches(":hover")) {
    STATE.hot = false;
    STATE.island.classList.remove("__cmt_hot");
    closePanel();
  }
}

// ---------------------------------------------------- pause / browse mode
export function togglePause() {
  setPaused(!STATE.paused);
}
function setPaused(paused) {
  STATE.paused = paused;
  if (paused) {
    closePopup(); // can't be mid-flag while browsing
    clearHover();
    STATE.island.classList.add("__cmt_paused");
    closePanel(); // pausing gets out of the way — it shouldn't bloom open
  } else {
    STATE.island.classList.remove("__cmt_paused");
  }
}
function onPauseClick(e) {
  e.stopPropagation();
  clearTimeout(dwellTimer); // don't let it expand right after a pause click
  disarmClose();
  togglePause();
}
function isTyping() {
  var el = document.activeElement;
  return !!(
    el &&
    (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))
  );
}
function onKeyDown(e) {
  if (e.key === "Escape") {
    if (STATE.commentOpen != null) {
      closeComment();
      return;
    }
    if (STATE.popup || isTyping()) return; // let the note editor / page fields keep Esc
    e.preventDefault();
    if (STATE.closeArmed) confirmCancel();
    else armClose();
    return;
  }
  // Alt+Shift+P toggles browse/flag. Ignore while typing in a field.
  if (!(e.altKey && e.shiftKey) || e.code !== "KeyP") return;
  if (isTyping()) return;
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
      flash("Copy failed", true);
      setTimeout(cleanup, 300);
      return;
    }
    STATE.exiting = true;
    finishSession();
    var btn = document.getElementById("__cmt_copy");
    if (btn) {
      btn.classList.add("__cmt_success");
      btn.textContent = "Copied " + n + " flag" + (n === 1 ? "" : "s") + " ✓";
    }
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
    clearHover();
    setTimeout(cleanup, 650);
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
  window.removeEventListener("scroll", onScroll, true);
  window.removeEventListener("resize", onResize);
  clearTimeout(dwellTimer);
  clearTimeout(leaveTimer);
  clearTimeout(armTimer);
  document.removeEventListener("mousemove", onDragMove, true);
  document.removeEventListener("mouseup", onDragEnd, true);
  teardownFollow();
  teardownProbe();
  Array.prototype.forEach.call(
    document.querySelectorAll(".__cmt_outline, .__cmt_selected"),
    function (el) {
      el.classList.remove("__cmt_outline", "__cmt_selected");
    },
  );
  Array.prototype.forEach.call(
    document.querySelectorAll(".__cmt_badge"),
    function (el) {
      el.remove();
    },
  );
  if (STATE.island && STATE.island.parentNode) STATE.island.remove();
  if (STATE.popup) STATE.popup.remove();
  if (STATE.style && STATE.style.parentNode) STATE.style.remove();
  document.documentElement.classList.remove("__cmt_root");
  delete window.__flaggerActive;
}

// Build the island, wire all listeners, and load the open session.
export function mount() {
  document.documentElement.classList.add("__cmt_root");
  injectStyles();
  installProbe();

  var island = document.createElement("div");
  island.id = "__cmt_island";
  island.innerHTML =
    '<div id="__cmt_card">' +
    '  <div class="__cmt_hd">' +
    '    <span class="ttl" id="__cmt_hd_title">Flags</span>' +
    '    <span class="count" id="__cmt_panel_count">0</span>' +
    '    <span class="sp"></span>' +
    '    <button class="__cmt_ib" id="__cmt_history" title="History">' +
    ICON.history +
    "</button>" +
    '    <button class="__cmt_ib" id="__cmt_close" title="Close (your session is saved to history)">' +
    ICON.close +
    "</button>" +
    "  </div>" +
    '  <div id="__cmt_panel_list"></div>' +
    '  <div id="__cmt_footL"></div>' +
    "</div>" +
    '<button id="__cmt_pause" title="Pause flagging — interact with the page (Alt+Shift+P)">' +
    '  <span class="__cmt_lyr rest">' +
    ICON.flag +
    '<span class="n" id="__cmt_count_label">0</span></span>' +
    '  <span class="__cmt_lyr pause">' +
    ICON.pause +
    '<span class="n">Pause</span></span>' +
    '  <span class="__cmt_lyr browse">' +
    ICON.play +
    '<span class="n">Resume</span></span>' +
    "</button>" +
    '<button id="__cmt_quickclose" title="Close Flagger">' +
    ICON.close +
    '<span class="k">Esc</span></button>';
  document.body.appendChild(island);
  STATE.island = island;
  STATE.toolbar = island; // alias for older references

  document
    .getElementById("__cmt_history")
    .addEventListener("click", toggleHistory);
  document
    .getElementById("__cmt_close")
    .addEventListener("click", confirmCancel);
  document
    .getElementById("__cmt_pause")
    .addEventListener("click", onPauseClick);
  document
    .getElementById("__cmt_quickclose")
    .addEventListener("click", confirmCancel);

  island.addEventListener("mouseenter", onIslandEnter);
  island.addEventListener("mouseleave", onIslandLeave);
  island.querySelector(".__cmt_hd").addEventListener("mousedown", onHeaderDown);
  document.addEventListener("mouseover", onMouseOver, true);
  document.addEventListener("mouseout", onMouseOut, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);

  renderContent(); // fill the (hidden) list + footer so it's ready on expand
  initFollow();
  initSessions();
}
