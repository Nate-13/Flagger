// On-page flag pins, Figma-comment style. Each pin is ONE element that morphs:
// at rest it's the small numbered tag; click it and that same surface grows out
// from the tag into the comment (read + edit in place), then contracts back.
import { STATE } from "./state.js";
import { ICON } from "./icons.js";
import { removeFlag, renderContent } from "./panel.js";
import { persist } from "./sessions.js";

var CARD_W = 258;
var TAG = 22;
var openBadge = null; // the currently expanded pin

export function addBadge(c) {
  var b = document.createElement("div");
  b.className = "__cmt_badge";
  b.dataset.id = c.id;

  var num = document.createElement("div");
  num.className = "__cmt_pinnum";
  num.textContent = STATE.flags.length;
  num.title = "Read flag";
  b.appendChild(num);

  var content = document.createElement("div");
  content.className = "__cmt_comment";
  b.appendChild(content);

  b.addEventListener("mousedown", function (e) {
    e.stopPropagation();
  });
  b.addEventListener("click", function (e) {
    if (e.target.closest(".__cmt_comment")) return; // clicks inside the note
    e.stopPropagation();
    e.preventDefault();
    toggleComment(c);
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
    if (!c.badge) return;
    var num = c.badge.querySelector(".__cmt_pinnum");
    if (num) num.textContent = i + 1;
  });
}

// ----------------------------------------------------- comment expansion
function toggleComment(c) {
  if (STATE.commentOpen === c.id) closeComment();
  else openComment(c);
}

function openComment(c) {
  if (openBadge && openBadge !== c.badge) closeComment();
  renderCommentRead(c);
  applyMorph(c); // measure the note, pick a direction, grow into it
  openBadge = c.badge;
  STATE.commentOpen = c.id;
}

export function closeComment() {
  if (openBadge) {
    openBadge.classList.remove("open", "cl-left", "cl-up");
    openBadge.style.height = "";
    openBadge.style.transform = "";
  }
  openBadge = null;
  STATE.commentOpen = null;
}

// Size the surface to its content and choose which way it unfurls so it stays
// on screen, then flip the `open` state on (transitions do the morph).
function applyMorph(c) {
  var badge = c.badge;
  if (!badge) return;
  var content = badge.querySelector(".__cmt_comment");
  badge.classList.remove("cl-left", "cl-up");
  var er =
    c.el && c.el.isConnected
      ? c.el.getBoundingClientRect()
      : badge.getBoundingClientRect();
  var pinLeft = er.right - 15;
  var pinTop = er.top - 9;
  var h = content.offsetHeight || 140; // natural height at CARD_W (clipped while small)
  var goLeft = pinLeft + CARD_W > window.innerWidth - 12;
  var goUp = pinTop + h > window.innerHeight - 12 && pinTop + TAG - h > 12;
  if (goLeft) badge.classList.add("cl-left");
  if (goUp) badge.classList.add("cl-up");
  var tx = goLeft ? -(CARD_W - TAG) : 0;
  var ty = goUp ? -(h - TAG) : 0;
  badge.style.height = h + "px";
  badge.style.transform = "translate(" + tx + "px," + ty + "px)";
  badge.classList.add("open");
}

function renderCommentRead(c) {
  var content = c.badge.querySelector(".__cmt_comment");
  content.innerHTML =
    '<div class="ctext"></div>' +
    '<div class="ctag"></div>' +
    '<div class="cacts">' +
    '  <button class="cedit">' +
    ICON.edit +
    " Edit</button>" +
    '  <button class="cdel danger" title="Delete">' +
    ICON.trash +
    "</button>" +
    "</div>";
  content.querySelector(".ctext").textContent = c.text;
  content.querySelector(".ctag").textContent = c.summary;
  content.querySelector(".cedit").addEventListener("click", function (e) {
    e.stopPropagation();
    editComment(c);
  });
  content.querySelector(".cdel").addEventListener("click", function (e) {
    e.stopPropagation();
    closeComment();
    removeFlag(c);
  });
}

function editComment(c) {
  var content = c.badge.querySelector(".__cmt_comment");
  content.innerHTML =
    "<textarea></textarea>" +
    '<div class="cacts">' +
    '  <button class="ccancel">Cancel</button>' +
    '  <button class="csave">' +
    ICON.check +
    " Save</button>" +
    "</div>";
  var ta = content.querySelector("textarea");
  ta.value = c.text;
  applyMorph(c); // the editor is taller — grow to fit
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
  content.querySelector(".ccancel").addEventListener("click", function (e) {
    e.stopPropagation();
    renderCommentRead(c);
    applyMorph(c);
  });
  content.querySelector(".csave").addEventListener("click", function (e) {
    e.stopPropagation();
    saveComment(c, ta.value);
  });
  ta.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveComment(c, ta.value);
    if (e.key === "Escape") {
      renderCommentRead(c);
      applyMorph(c);
    }
  });
}

function saveComment(c, text) {
  var t = (text || "").trim();
  if (!t) {
    closeComment();
    removeFlag(c);
    return;
  }
  c.text = t;
  persist();
  renderContent();
  renderCommentRead(c);
  applyMorph(c);
}
