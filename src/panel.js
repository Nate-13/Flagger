// The card content inside the island: the flag list, editing, locating, and
// the expand/collapse + view-switching plumbing (flags ⇄ history).
import { STATE } from "./state.js";
import { ICON } from "./icons.js";
import { DANGER } from "./theme.js";
import { escapeHtml, hostOf, flash } from "./utils.js";
import { renumberBadges } from "./badges.js";
import { persist, navigateToFlag, newSession } from "./sessions.js";
import { renderHistory } from "./history.js";
import { copyAndExit } from "./overlay.js";

// ----------------------------------------------------- expand / collapse
export function openPanel() {
  if (!STATE.island) return;
  STATE.island.classList.add("__cmt_open", "__cmt_hot");
  STATE.hot = true;
  STATE.open = true;
  sizeIsland();
}

export function closePanel() {
  if (STATE.island) {
    STATE.island.classList.remove("__cmt_open");
    STATE.island.style.height = ""; // back to the collapsed pill height
  }
  STATE.open = false;
  STATE.pinned = false;
  // a collapsed card always reopens to the flags view
  if (STATE.view === "history") {
    STATE.view = "flags";
    STATE.historyOpen = false;
    renderContent();
  }
}

// Grow the card to exactly fit its content (header + list + footer), capped so
// long lists scroll instead. Measured off-screen at the open width so it's
// accurate even mid-morph.
export function sizeIsland() {
  if (!STATE.island || !STATE.open) return;
  var list = document.getElementById("__cmt_panel_list");
  if (!list) return;
  var clone = list.cloneNode(true);
  clone.removeAttribute("id");
  clone.style.cssText =
    "position:absolute;left:-9999px;right:auto;top:0;bottom:auto;visibility:hidden;width:338px;height:auto;overflow:visible;";
  document.body.appendChild(clone);
  var listH = clone.offsetHeight;
  clone.remove();
  var h = 48 + Math.max(180, Math.min(listH, 420)) + 46;
  STATE.island.style.height = h + "px";
}

// ----------------------------------------------------- view switching
export function setView(v) {
  STATE.view = v;
  STATE.historyOpen = v === "history";
  renderContent();
}

// Render whichever view is active into the shared list + footer.
export function renderContent() {
  var title = document.getElementById("__cmt_hd_title");
  if (STATE.view === "history") {
    if (title) title.textContent = "History";
    renderHistory();
    renderFooter("history");
  } else {
    if (title) title.textContent = "Flags";
    renderPanel();
    renderFooter("flags");
  }
}

function renderFooter(mode) {
  var f = document.getElementById("__cmt_footL");
  if (!f) return;
  if (mode === "history") {
    f.innerHTML =
      '<button class="newbtn" id="__cmt_hist_new">' +
      ICON.plus +
      " New session</button>";
    document
      .getElementById("__cmt_hist_new")
      .addEventListener("click", function () {
        newSession();
      });
  } else {
    f.innerHTML =
      '<button class="copy" id="__cmt_copy">' +
      ICON.copy +
      " Copy &amp; exit</button>";
    document
      .getElementById("__cmt_copy")
      .addEventListener("click", copyAndExit);
  }
}

// ----------------------------------------------------- flag list
export function renderPanel() {
  var list = document.getElementById("__cmt_panel_list");
  if (!list) return;
  var headCount = document.getElementById("__cmt_panel_count");
  if (headCount) headCount.textContent = STATE.flags.length;
  if (!STATE.flags.length) {
    list.innerHTML =
      '<div class="empty"><strong>No flags yet</strong>Click any element on the page to flag it.</div>';
    if (STATE.open) sizeIsland();
    return;
  }
  list.innerHTML = "";
  STATE.flags.forEach(function (c, i) {
    var card = document.createElement("div");
    card.className = "__cmt_card";
    card.dataset.id = c.id;
    var crossPage = c.url && c.url !== location.href;
    if (crossPage) card.title = "On " + hostOf(c.url) + " — click to go there";
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
  if (STATE.open) sizeIsland();
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
  if (STATE.open) sizeIsland();

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
    navigateToFlag(c); // it's on another page — go there (and highlight on arrival)
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

// Open the card from an on-page badge and highlight that flag's row.
export function showFlag(c) {
  if (STATE.view !== "flags") setView("flags");
  openPanel();
  STATE.pinned = true; // stays open until you click away
  setTimeout(function () {
    var list = document.getElementById("__cmt_panel_list");
    if (!list) return;
    var card = list.querySelector('.__cmt_card[data-id="' + c.id + '"]');
    if (!card) return;
    card.scrollIntoView({ block: "center" });
    card.classList.add("__cmt_highlight");
    setTimeout(function () {
      card.classList.remove("__cmt_highlight");
    }, 1500);
  }, 60);
}

export function updateCount() {
  var n = STATE.flags.length;
  var el = document.getElementById("__cmt_count_label");
  if (el) el.textContent = n;
  var pc = document.getElementById("__cmt_panel_count");
  if (pc) pc.textContent = n;
}
