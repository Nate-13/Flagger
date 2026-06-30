// Element selection + the "Why flag this?" popup that creates a flag.
import { STATE } from "./state.js";
import { cssSelector, elementSummary, escapeHtml } from "./utils.js";
import { addBadge } from "./badges.js";
import { updateCount, renderContent } from "./panel.js";
import { persist } from "./sessions.js";

export function selectElement(el, mouseX, mouseY) {
  if (STATE.hoverEl) STATE.hoverEl.classList.remove("__cmt_outline");
  el.classList.add("__cmt_selected");
  STATE.selectedEl = el;

  var popup = document.createElement("div");
  popup.id = "__cmt_popup";
  popup.innerHTML =
    '<div class="target">' +
    escapeHtml(elementSummary(el)) +
    "</div>" +
    '<textarea placeholder="Why flag this?"></textarea>' +
    '<div class="row">' +
    '  <span class="hint">⌘/Ctrl + Enter</span>' +
    '  <button class="cancel">Cancel</button>' +
    '  <button class="save">Save</button>' +
    "</div>";
  document.body.appendChild(popup);

  var rect = el.getBoundingClientRect();
  var top =
    window.scrollY + Math.min(rect.bottom + 8, window.innerHeight - 200);
  var left = window.scrollX + Math.min(rect.left, window.innerWidth - 360);
  popup.style.top = top + "px";
  popup.style.left = Math.max(10, left) + "px";
  STATE.popup = popup;

  var ta = popup.querySelector("textarea");
  ta.focus();
  popup.querySelector(".save").addEventListener("click", function () {
    saveFlag(ta.value, mouseX, mouseY);
  });
  popup.querySelector(".cancel").addEventListener("click", cancelFlag);
  ta.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
      saveFlag(ta.value, mouseX, mouseY);
    if (e.key === "Escape") cancelFlag();
  });
}

export function saveFlag(text, x, y) {
  var t = (text || "").trim();
  if (!t) {
    cancelFlag();
    return;
  }
  var el = STATE.selectedEl;
  var c = {
    id: STATE.nextId++,
    el: el,
    url: location.href,
    selector: cssSelector(el),
    summary: elementSummary(el),
    x: Math.round(x),
    y: Math.round(y),
    text: t,
    badge: null,
  };
  STATE.flags.push(c);
  addBadge(c);
  closePopup();
  updateCount();
  renderContent();
  persist();
}

export function cancelFlag() {
  closePopup();
}

export function closePopup() {
  if (STATE.selectedEl) STATE.selectedEl.classList.remove("__cmt_selected");
  STATE.selectedEl = null;
  if (STATE.popup) {
    STATE.popup.remove();
    STATE.popup = null;
  }
}
