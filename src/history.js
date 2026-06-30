// History view: the island's list, switched to show saved sessions with
// quick-copy, reopen, and delete. (Shares the flags list container; the footer
// swaps to "New session" — see panel.renderContent / renderFooter.)
import { STATE } from "./state.js";
import { ICON } from "./icons.js";
import { sessionTitle, uniqueUrlCount, relTime } from "./utils.js";
import { setView, openPanel, sizeIsland } from "./panel.js";
import { reopenSession, quickCopy, deleteSession } from "./sessions.js";

export function toggleHistory() {
  setView(STATE.view === "history" ? "flags" : "history");
  openPanel();
}

export function renderHistory() {
  var list = document.getElementById("__cmt_panel_list");
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
    if (STATE.open) sizeIsland();
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
  if (STATE.open) sizeIsland();
}
