// Floating numbered stickers pinned to flagged elements on the current page.
import { STATE } from "./state.js";
import { showFlag } from "./panel.js";

export function addBadge(c) {
  var b = document.createElement("div");
  b.className = "__cmt_badge";
  b.title = "View flag";
  b.textContent = STATE.flags.length;
  b.addEventListener("mousedown", function (e) {
    e.stopPropagation();
  });
  b.addEventListener("click", function (e) {
    e.stopPropagation();
    e.preventDefault();
    showFlag(c);
  });
  document.body.appendChild(b);
  c.badge = b;
  repositionBadges();
}

export function repositionBadges() {
  STATE.flags.forEach(function (c) {
    if (!c.badge || !c.el || !c.el.isConnected) return;
    var r = c.el.getBoundingClientRect();
    c.badge.style.top = window.scrollY + r.top - 9 + "px";
    c.badge.style.left = window.scrollX + r.right - 15 + "px";
  });
}

export function renumberBadges() {
  STATE.flags.forEach(function (c, i) {
    if (c.badge) c.badge.textContent = i + 1;
  });
}
