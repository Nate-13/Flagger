// The Flags panel: list of flag cards, editing, locating, and panel layout.
import { STATE } from "./state.js";
import { ICON } from "./icons.js";
import { DANGER } from "./theme.js";
import { escapeHtml, hostOf, flash } from "./utils.js";
import { renumberBadges } from "./badges.js";
import { persist } from "./sessions.js";
import { closeHistory } from "./history.js";
import { copyAndExit } from "./overlay.js";

export function togglePanel() {
  if (STATE.panelOpen) closePanel();
  else openPanel();
}

export function openPanel() {
  if (STATE.panel) return;
  if (STATE.historyOpen) closeHistory();
  var panel = document.createElement("div");
  panel.id = "__cmt_panel";
  panel.className = "__cmt_panel";
  panel.innerHTML =
    '<div class="head">' +
    '  <div class="title">' +
    "    <h3>Flags</h3>" +
    '    <span class="count" id="__cmt_panel_count">0</span>' +
    "  </div>" +
    '  <button class="x" id="__cmt_panel_close" title="Close">' +
    ICON.close +
    "</button>" +
    "</div>" +
    '<div class="list" id="__cmt_panel_list"></div>' +
    '<div class="foot">' +
    '  <button class="copy" id="__cmt_panel_copy">' +
    ICON.copy +
    " Copy &amp; Exit</button>" +
    "</div>";
  document.body.appendChild(panel);
  STATE.panel = panel;
  STATE.panelOpen = true;

  document
    .getElementById("__cmt_panel_close")
    .addEventListener("click", closePanel);
  document
    .getElementById("__cmt_panel_copy")
    .addEventListener("click", copyAndExit);
  renderPanel();
  positionPanel();
}

export function closePanel() {
  if (STATE.panel) STATE.panel.remove();
  STATE.panel = null;
  STATE.panelOpen = false;
}

export function positionBox(box) {
  if (!box) return;
  var t = STATE.toolbar.getBoundingClientRect();
  var panelW = 380;
  var gap = 12;
  var margin = 16;
  var minH = 240;

  var spaceBelow = window.innerHeight - t.bottom - gap - margin;
  var spaceAbove = t.top - gap - margin;
  var dropDown = spaceBelow >= minH || spaceBelow >= spaceAbove;

  var maxH = Math.max(minH, dropDown ? spaceBelow : spaceAbove);
  if (dropDown) {
    box.style.top = t.bottom + gap + "px";
    box.style.bottom = "auto";
  } else {
    box.style.top = "auto";
    box.style.bottom = window.innerHeight - t.top + gap + "px";
  }
  box.style.maxHeight = maxH + "px";

  var leftPos = t.right - panelW;
  if (leftPos < margin)
    leftPos = Math.min(t.left, window.innerWidth - panelW - margin);
  if (leftPos < margin) leftPos = margin;
  box.style.left = leftPos + "px";
  box.style.right = "auto";
}

export function positionPanel() {
  if (STATE.panel) positionBox(STATE.panel);
}

export function repositionOpenBoxes() {
  if (STATE.panelOpen) positionBox(STATE.panel);
  if (STATE.historyOpen) positionBox(STATE.history);
}

export function renderPanel() {
  var list = document.getElementById("__cmt_panel_list");
  if (!list) return;
  var headCount = document.getElementById("__cmt_panel_count");
  if (headCount) headCount.textContent = STATE.flags.length;
  if (!STATE.flags.length) {
    list.innerHTML =
      '<div class="empty"><strong>No flags yet</strong>Click any element to flag it.</div>';
    return;
  }
  list.innerHTML = "";
  STATE.flags.forEach(function (c, i) {
    var card = document.createElement("div");
    card.className = "__cmt_card";
    card.dataset.id = c.id;
    var crossPage = c.url && c.url !== location.href;
    card.innerHTML =
      (crossPage
        ? '<div class="host">↗ ' + escapeHtml(hostOf(c.url)) + "</div>"
        : "") +
      '<div class="top">' +
      '  <div class="num">' +
      (i + 1) +
      "</div>" +
      '  <div class="body"></div>' +
      "</div>" +
      '<div class="meta">' +
      '  <div class="tag">' +
      escapeHtml(c.summary) +
      "</div>" +
      '  <div class="actions">' +
      '    <button class="edit" title="Edit">' +
      ICON.edit +
      "</button>" +
      '    <button class="danger remove" title="Delete">' +
      ICON.trash +
      "</button>" +
      "  </div>" +
      "</div>";
    card.querySelector(".body").textContent = c.text;
    card.addEventListener("click", function (e) {
      if (card.classList.contains("editing")) return;
      if (e.target.closest(".actions")) return;
      if (e.target.closest("textarea")) return;
      locateFlag(c);
    });
    card.querySelector(".edit").addEventListener("click", function () {
      startEdit(card, c);
    });
    card.querySelector(".remove").addEventListener("click", function () {
      removeFlag(c);
    });
    list.appendChild(card);
  });
}

export function startEdit(card, c) {
  if (card.classList.contains("editing")) return;
  card.classList.add("editing");
  var body = card.querySelector(".body");
  body.innerHTML = "";
  var ta = document.createElement("textarea");
  ta.value = c.text;
  body.appendChild(ta);
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);

  var actions = card.querySelector(".actions");
  actions.innerHTML =
    '<button class="cancel-edit">Cancel</button>' +
    '<button class="save">' +
    ICON.check +
    " Save</button>";
  actions.querySelector(".cancel-edit").addEventListener("click", function () {
    renderPanel();
  });
  actions.querySelector(".save").addEventListener("click", function () {
    commitEdit(c, ta.value);
  });
  ta.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit(c, ta.value);
    if (e.key === "Escape") renderPanel();
  });
}

export function commitEdit(c, text) {
  var t = (text || "").trim();
  if (!t) {
    removeFlag(c);
    return;
  }
  c.text = t;
  renderPanel();
  persist();
}

export function removeFlag(c) {
  var idx = STATE.flags.indexOf(c);
  if (idx === -1) return;
  STATE.flags.splice(idx, 1);
  if (c.badge) c.badge.remove();
  renumberBadges();
  updateCount();
  renderPanel();
  persist();
}

export function locateFlag(c) {
  if (c.url && c.url !== location.href) {
    flash("Flag is on another page", DANGER);
    return;
  }
  if (!c.el || !c.el.isConnected) {
    try {
      c.el = document.querySelector(c.selector);
    } catch (e) {
      c.el = null;
    }
  }
  if (!c.el) {
    flash("Element not found", DANGER);
    return;
  }
  c.el.scrollIntoView({ behavior: "smooth", block: "center" });
  c.el.classList.add("__cmt_flash_anim");
  setTimeout(function () {
    c.el.classList.remove("__cmt_flash_anim");
  }, 600);
}

export function showFlag(c) {
  if (!STATE.panelOpen) openPanel();
  setTimeout(function () {
    if (!STATE.panel) return;
    var card = STATE.panel.querySelector('.__cmt_card[data-id="' + c.id + '"]');
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("__cmt_highlight");
    setTimeout(function () {
      card.classList.remove("__cmt_highlight");
    }, 1500);
  }, 30);
}

export function updateCount() {
  var n = STATE.flags.length;
  var el = document.getElementById("__cmt_count_label");
  if (el) {
    el.textContent = n;
    el.classList.toggle("empty", n === 0);
  }
  var pc = document.getElementById("__cmt_panel_count");
  if (pc) pc.textContent = n;
}
