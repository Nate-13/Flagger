// The History panel: lists saved sessions with quick-copy, reopen, and delete.
import { STATE } from "./state.js";
import { ICON } from "./icons.js";
import { sessionTitle, uniqueUrlCount, relTime } from "./utils.js";
import { closePanel, positionBox } from "./panel.js";
import {
  reopenSession,
  quickCopy,
  deleteSession,
  newSession,
} from "./sessions.js";

export function toggleHistory() {
  if (STATE.historyOpen) closeHistory();
  else openHistory();
}

export function openHistory() {
  if (STATE.history) return;
  if (STATE.panelOpen) closePanel();
  var el = document.createElement("div");
  el.id = "__cmt_history_panel";
  el.className = "__cmt_panel";
  el.innerHTML =
    '<div class="head">' +
    '  <div class="title"><h3>History</h3></div>' +
    '  <button class="x" id="__cmt_hist_close" title="Close">' +
    ICON.close +
    "</button>" +
    "</div>" +
    '<div class="list" id="__cmt_hist_list"></div>' +
    '<div class="foot">' +
    '  <button class="newbtn" id="__cmt_hist_new">' +
    ICON.plus +
    " New session</button>" +
    "</div>";
  document.body.appendChild(el);
  STATE.history = el;
  STATE.historyOpen = true;
  document
    .getElementById("__cmt_hist_close")
    .addEventListener("click", closeHistory);
  document
    .getElementById("__cmt_hist_new")
    .addEventListener("click", function () {
      newSession();
    });
  renderHistory();
  positionBox(el);
}

export function closeHistory() {
  if (STATE.history) STATE.history.remove();
  STATE.history = null;
  STATE.historyOpen = false;
}

export function renderHistory() {
  var list = document.getElementById("__cmt_hist_list");
  if (!list) return;
  var sessions = (STATE.store ? STATE.store.sessions : []).filter(function (s) {
    return s.flags && s.flags.length;
  });
  sessions.sort(function (a, b) {
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
  if (!sessions.length) {
    list.innerHTML =
      '<div class="empty"><strong>No history yet</strong>Sessions you copy or set aside show up here.</div>';
    return;
  }
  list.innerHTML = "";
  sessions.forEach(function (s) {
    var isOpen = s.id === STATE.sessionId;
    var chip = isOpen
      ? '<span class="chip open">Open</span>'
      : s.copied
        ? '<span class="chip copied">Copied</span>'
        : '<span class="chip draft">Draft</span>';
    var n = s.flags.length;
    var pages = uniqueUrlCount(s.flags);
    var row = document.createElement("div");
    row.className = "__cmt_card __cmt_srow";
    row.dataset.id = s.id;
    row.innerHTML =
      '<div class="top">' +
      '  <div class="body" style="flex:1;min-width:0;">' +
      '    <div class="stitle"></div>' +
      '    <div class="smeta">' +
      "      <span>" +
      n +
      " flag" +
      (n === 1 ? "" : "s") +
      " · " +
      pages +
      " page" +
      (pages === 1 ? "" : "s") +
      " · " +
      relTime(s.updatedAt) +
      "</span>" +
      chip +
      "    </div>" +
      "  </div>" +
      '  <div class="actions">' +
      '    <button class="scopy" title="Copy this session">' +
      ICON.copy +
      "</button>" +
      '    <button class="danger sdel" title="Delete session">' +
      ICON.trash +
      "</button>" +
      "  </div>" +
      "</div>";
    row.querySelector(".stitle").textContent = sessionTitle(s);
    row.addEventListener("click", function (e) {
      if (e.target.closest(".actions")) return;
      reopenSession(s.id);
    });
    row.querySelector(".scopy").addEventListener("click", function (e) {
      e.stopPropagation();
      quickCopy(s);
    });
    row.querySelector(".sdel").addEventListener("click", function (e) {
      e.stopPropagation();
      if (confirm("Delete this session? This cannot be undone."))
        deleteSession(s.id);
    });
    list.appendChild(row);
  });
}
