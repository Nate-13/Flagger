(function () {
  if (window.__flaggerActive) {
    alert("Flagger is already running on this page.");
    return;
  }
  window.__flaggerActive = true;

  var HAZARD = "#FFC800";
  var HAZARD_DARK = "#E6B400";
  var BLACK = "#0a0a0a";
  var CREAM = "#FFFFFF";
  var DANGER = "#DC2626";
  var SUCCESS = "#84CC16";
  var FONT_STACK =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  var MONO_STACK = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  var STRIPE =
    "repeating-linear-gradient(45deg, " +
    BLACK +
    " 0 12px, " +
    HAZARD +
    " 12px 24px)";

  var STATE = {
    flags: [],
    selectedEl: null,
    popup: null,
    panel: null,
    panelOpen: false,
    hoverEl: null,
    nextId: 1,
    dragging: false,
    dragOffX: 0,
    dragOffY: 0,
    exiting: false,
    store: null, // loaded { sessions: [...], openId } from chrome.storage
    sessionId: null, // id of the current open session (null until first flag)
    history: null, // history panel element
    historyOpen: false,
  };

  // ---------------------------------------------------------------- styles
  var style = document.createElement("style");
  style.id = "__cmt_style";
  style.textContent = [
    // -------- animations
    "@keyframes __cmt_fadeIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }",
    "@keyframes __cmt_fadeOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: scale(0.96) translateY(-4px); } }",
    "@keyframes __cmt_pop { 0% { transform: scale(1); } 45% { transform: scale(1.08); } 100% { transform: scale(1); } }",
    "@keyframes __cmt_pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } }",
    "@keyframes __cmt_slamIn { 0% { transform: scale(0.5) rotate(-8deg); opacity: 0; } 60% { transform: scale(1.1) rotate(2deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }",

    // -------- font isolation: defeat host page styles, keep monospace where wanted
    "#__cmt_toolbar, #__cmt_toolbar *, #__cmt_popup, #__cmt_popup *, .__cmt_panel, .__cmt_panel *, #__cmt_flash {",
    "  font-family: " + FONT_STACK + " !important;",
    "  font-style: normal !important;",
    "  letter-spacing: normal !important;",
    "  line-height: 1.4 !important;",
    "  text-shadow: none !important;",
    "  text-decoration: none !important;",
    "  box-sizing: border-box !important;",
    "}",
    "#__cmt_popup .target, .__cmt_card .tag {",
    "  font-family: " + MONO_STACK + " !important;",
    "}",

    // -------- page hover/select outlines
    ".__cmt_outline { outline: 3px solid " +
      HAZARD +
      " !important; outline-offset: 2px !important;",
    "  cursor: crosshair !important; }",
    ".__cmt_selected { outline: 3px solid " +
      DANGER +
      " !important; outline-offset: 2px !important; }",
    ".__cmt_flash_anim { animation: __cmt_pulse 0.55s ease; }",

    // ============================================================
    // TOOLBAR — cream + black with hazard accents
    // ============================================================
    "#__cmt_toolbar { position: fixed; top: 16px; right: 16px; z-index: 2147483647;",
    "  background: " + CREAM + "; border: 2px solid " + BLACK + ";",
    "  color: " +
      BLACK +
      "; padding: 8px 4px 4px; border-radius: 8px; font-size: 13px;",
    "  box-shadow: 4px 4px 0 " + BLACK + ";",
    "  display: flex; gap: 2px; align-items: center; user-select: none; cursor: grab;",
    "  animation: __cmt_fadeIn 0.2s ease both; }",
    // hazard tape strip along top edge — tucked inside the border
    '#__cmt_toolbar::before { content: ""; position: absolute; top: 0; left: 0; right: 0;',
    "  height: 4px; background: " +
      STRIPE +
      "; border-radius: 6px 6px 0 0; pointer-events: none; }",
    "#__cmt_toolbar.__cmt_dragging { cursor: grabbing; }",

    // drag grip
    "#__cmt_toolbar .grip { display: inline-flex; padding: 8px 5px; color: " +
      BLACK +
      "; cursor: grab;",
    "  border-radius: 4px; transition: background 0.12s; flex-shrink: 0; opacity: 0.4; }",
    "#__cmt_toolbar .grip:hover { opacity: 1; background: rgba(0,0,0,0.06); }",
    "#__cmt_toolbar.__cmt_dragging .grip { cursor: grabbing; opacity: 1; }",
    "#__cmt_toolbar .grip svg { width: 10px; height: 14px; }",

    // toolbar buttons
    "#__cmt_toolbar button { font-family: " +
      FONT_STACK +
      " !important; font-size: 12px !important;",
    "  padding: 7px 11px; border-radius: 4px; border: 0; cursor: pointer;",
    "  background: transparent; color: " +
      BLACK +
      "; font-weight: 700 !important;",
    "  text-transform: uppercase !important; letter-spacing: 0.04em !important;",
    "  display: inline-flex; align-items: center; gap: 6px;",
    "  transition: background 0.12s, color 0.12s; line-height: 1;",
    "  white-space: nowrap; flex-shrink: 0; }",
    "#__cmt_toolbar button:hover { background: rgba(0,0,0,0.06); }",
    "#__cmt_toolbar button.primary {",
    "  background: " +
      HAZARD +
      "; color: " +
      BLACK +
      "; border: 2px solid " +
      BLACK +
      ";",
    "  padding: 6px 11px; box-shadow: 2px 2px 0 " + BLACK + "; }",
    "#__cmt_toolbar button.primary:hover { background: " +
      HAZARD_DARK +
      "; color: " +
      BLACK +
      "; }",
    "#__cmt_toolbar button.icon-only { padding: 7px 8px; opacity: 0.5; }",
    "#__cmt_toolbar button.icon-only:hover { opacity: 1; background: rgba(220,38,38,0.12); color: " +
      DANGER +
      "; }",
    "#__cmt_toolbar button svg { width: 14px; height: 14px; flex-shrink: 0; }",

    // count pill (inside Flags button)
    "#__cmt_view .pill { display: inline-flex; align-items: center; justify-content: center;",
    "  min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px;",
    "  background: " +
      HAZARD +
      "; color: " +
      BLACK +
      "; border: 2px solid " +
      BLACK +
      ";",
    "  font-size: 11px !important; font-weight: 800 !important;",
    "  line-height: 1 !important; margin-left: 4px; transition: background 0.12s; }",
    "#__cmt_view .pill.empty { background: transparent; color: " +
      BLACK +
      "; border-color: " +
      BLACK +
      "; opacity: 0.4; }",

    // ============================================================
    // POPUP — sticker-style new flag dialog
    // ============================================================
    "#__cmt_popup { position: absolute; z-index: 2147483647; background: white; color: " +
      BLACK +
      ";",
    "  border: 3px solid " +
      BLACK +
      "; border-radius: 6px; padding: 14px; width: 340px; font-size: 13px;",
    "  box-shadow: 5px 5px 0 " + BLACK + ";",
    "  animation: __cmt_slamIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both; }",
    "#__cmt_popup .target { font-size: 11px !important; color: " +
      BLACK +
      " !important;",
    "  background: " +
      HAZARD +
      "; padding: 5px 8px; border-radius: 3px; margin-bottom: 10px;",
    "  word-break: break-all; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    "  line-height: 1.4 !important; border: 2px solid " +
      BLACK +
      "; font-weight: 700 !important; }",
    "#__cmt_popup textarea { width: 100%; min-height: 88px; padding: 10px 12px;",
    "  border-radius: 4px; border: 2px solid " +
      BLACK +
      "; resize: vertical; background: white;",
    "  color: " +
      BLACK +
      "; outline: none; font-size: 14px !important; line-height: 1.5 !important;",
    "  font-weight: 500 !important;",
    "  transition: box-shadow 0.12s; }",
    "#__cmt_popup textarea:focus { box-shadow: 3px 3px 0 " + HAZARD + "; }",
    "#__cmt_popup .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; align-items: center; }",
    "#__cmt_popup .hint { flex: 1; font-size: 10px !important; color: " +
      BLACK +
      " !important;",
    "  text-transform: uppercase !important; letter-spacing: 0.06em !important; font-weight: 700 !important; opacity: 0.5; }",
    "#__cmt_popup button { font-size: 12px !important; padding: 7px 14px; border-radius: 4px;",
    "  cursor: pointer; font-weight: 800 !important; line-height: 1;",
    "  text-transform: uppercase !important; letter-spacing: 0.04em !important;",
    "  border: 2px solid " +
      BLACK +
      "; transition: transform 0.08s, box-shadow 0.08s, background 0.12s; }",
    "#__cmt_popup button.save { background: " +
      HAZARD +
      "; color: " +
      BLACK +
      "; box-shadow: 2px 2px 0 " +
      BLACK +
      "; }",
    "#__cmt_popup button.save:hover { background: " + HAZARD_DARK + "; }",
    "#__cmt_popup button.save:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 " +
      BLACK +
      "; }",
    "#__cmt_popup button.cancel { background: white; color: " + BLACK + "; }",
    "#__cmt_popup button.cancel:hover { background: #f5f5f5; }",

    // ============================================================
    // PANEL — bold cream card with hard shadow
    // ============================================================
    ".__cmt_panel { position: fixed; width: 380px;",
    "  z-index: 2147483646; background: " +
      CREAM +
      "; border: 3px solid " +
      BLACK +
      ";",
    "  color: " + BLACK + "; border-radius: 8px; overflow: hidden;",
    "  box-shadow: 6px 6px 0 " + BLACK + ";",
    "  display: flex; flex-direction: column; font-size: 13px;",
    "  animation: __cmt_fadeIn 0.2s ease both; }",
    ".__cmt_panel .head { padding: 14px 16px; background: " + CREAM + ";",
    "  display: flex; align-items: center; justify-content: space-between;",
    "  border-bottom: 2px solid " + BLACK + "; }",
    ".__cmt_panel .head .title { display: inline-flex; align-items: center; gap: 10px; }",
    ".__cmt_panel .head h3 { margin: 0 !important; padding: 0 !important;",
    "  font-size: 14px !important; font-weight: 900 !important; color: " +
      BLACK +
      " !important;",
    "  text-transform: uppercase !important; letter-spacing: 0.06em !important; line-height: 1 !important; }",
    ".__cmt_panel .head .count {",
    "  display: inline-flex; align-items: center; justify-content: center;",
    "  min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px;",
    "  background: " +
      HAZARD +
      "; color: " +
      BLACK +
      "; border: 2px solid " +
      BLACK +
      ";",
    "  font-size: 11px !important; font-weight: 900 !important; line-height: 1 !important; }",
    ".__cmt_panel .head .x { background: transparent; border: 0; color: " +
      BLACK +
      ";",
    "  cursor: pointer; padding: 5px; border-radius: 4px; display: flex; opacity: 0.5;",
    "  transition: opacity 0.12s, background 0.12s, color 0.12s; }",
    ".__cmt_panel .head .x:hover { opacity: 1; background: rgba(220,38,38,0.15); color: " +
      DANGER +
      "; }",
    ".__cmt_panel .head .x svg { width: 16px; height: 16px; }",
    ".__cmt_panel .list { flex: 1; overflow-y: auto; padding: 16px 12px 8px; }",
    ".__cmt_panel .empty { color: " +
      BLACK +
      " !important; text-align: center; padding: 40px 16px;",
    "  font-size: 13px !important; line-height: 1.6 !important; opacity: 0.55; }",
    ".__cmt_panel .empty strong {",
    "  display: block; font-size: 14px !important; font-weight: 900 !important;",
    "  text-transform: uppercase !important; letter-spacing: 0.06em !important; margin-bottom: 6px; opacity: 1; }",

    // ============================================================
    // FLAG CARDS — sticker style with hard shadow
    // ============================================================
    ".__cmt_card { background: white; border: 2px solid " + BLACK + ";",
    "  border-radius: 5px; padding: 12px 14px; margin-bottom: 10px; cursor: pointer;",
    "  box-shadow: 3px 3px 0 " + BLACK + ";",
    "  transition: transform 0.08s, box-shadow 0.08s, background 0.12s; animation: __cmt_fadeIn 0.18s ease both; }",
    ".__cmt_card:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 " +
      BLACK +
      "; background: #fffce8; }",
    ".__cmt_card.editing { cursor: default; background: #fffce8; }",
    ".__cmt_card.__cmt_highlight { background: " + HAZARD + " !important;",
    "  transform: translate(-1px, -1px); box-shadow: 4px 4px 0 " +
      BLACK +
      " !important; transition: all 0.3s; }",

    ".__cmt_card .top { display: flex; align-items: flex-start; gap: 10px; }",
    ".__cmt_card .num { width: 22px; height: 22px; border-radius: 50%; background: " +
      HAZARD +
      ";",
    "  color: " + BLACK + "; border: 2px solid " + BLACK + ";",
    "  font-size: 11px !important; font-weight: 900 !important;",
    "  display: flex; align-items: center; justify-content: center; flex-shrink: 0;",
    "  line-height: 1 !important; margin-top: 1px; }",
    ".__cmt_card .body { color: " +
      BLACK +
      " !important; font-size: 14px !important; line-height: 1.5 !important;",
    "  font-weight: 500 !important;",
    "  white-space: pre-wrap; word-break: break-word; flex: 1; min-width: 0; }",

    ".__cmt_card .meta { display: flex; align-items: center; gap: 8px;",
    "  margin-top: 10px; padding-top: 8px; padding-left: 30px;",
    "  border-top: 1.5px dashed " + BLACK + "; }",
    ".__cmt_card .tag { font-size: 11px !important; color: " +
      BLACK +
      " !important; opacity: 0.55;",
    "  flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    "  line-height: 1.4 !important; font-weight: 600 !important; }",

    ".__cmt_card .actions { display: flex; gap: 4px; flex-shrink: 0;",
    "  opacity: 0; transition: opacity 0.12s; }",
    ".__cmt_card:hover .actions, .__cmt_card.editing .actions { opacity: 1; }",
    ".__cmt_card .actions button { background: white; border: 2px solid " +
      BLACK +
      "; color: " +
      BLACK +
      ";",
    "  cursor: pointer; padding: 4px 6px; border-radius: 3px;",
    "  font-size: 11px !important; font-weight: 800 !important;",
    "  text-transform: uppercase !important; letter-spacing: 0.04em !important;",
    "  display: inline-flex; align-items: center; gap: 4px;",
    "  transition: background 0.12s, color 0.12s, transform 0.08s, box-shadow 0.08s; line-height: 1; }",
    ".__cmt_card .actions button:hover { background: " + HAZARD + "; }",
    ".__cmt_card .actions button.danger:hover { background: " +
      DANGER +
      "; color: white; border-color: " +
      DANGER +
      "; }",
    ".__cmt_card .actions button.save { background: " +
      HAZARD +
      "; padding: 4px 9px; box-shadow: 2px 2px 0 " +
      BLACK +
      "; }",
    ".__cmt_card .actions button.save:hover { background: " +
      HAZARD_DARK +
      "; }",
    ".__cmt_card .actions button.save:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 " +
      BLACK +
      "; }",
    ".__cmt_card .actions button.cancel-edit { padding: 4px 9px; }",
    ".__cmt_card .actions svg { width: 12px !important; height: 12px !important; flex-shrink: 0; }",

    ".__cmt_card textarea { width: 100%; min-height: 70px; padding: 8px 10px;",
    "  border-radius: 3px; border: 2px solid " + BLACK + "; background: white;",
    "  color: " +
      BLACK +
      "; resize: vertical; outline: none; font-size: 14px !important; line-height: 1.5 !important;",
    "  font-weight: 500 !important;",
    "  margin-top: 0; transition: box-shadow 0.12s; }",
    ".__cmt_card textarea:focus { box-shadow: 3px 3px 0 " + HAZARD + "; }",

    // panel footer (cream bg, just a black top border — no stripe, no black band)
    ".__cmt_panel .foot { padding: 12px; background: " + CREAM + ";",
    "  border-top: 2px solid " + BLACK + "; display: flex; gap: 8px; }",
    ".__cmt_panel .foot button { flex: 1; padding: 10px 14px; border-radius: 4px;",
    "  border: 2px solid " +
      BLACK +
      "; cursor: pointer; font-weight: 800 !important; font-size: 13px !important;",
    "  text-transform: uppercase !important; letter-spacing: 0.04em !important;",
    "  display: inline-flex; align-items: center; justify-content: center; gap: 8px;",
    "  line-height: 1; transition: transform 0.08s, box-shadow 0.08s, background 0.12s; }",
    ".__cmt_panel .foot .copy { background: " +
      HAZARD +
      "; color: " +
      BLACK +
      ";",
    "  box-shadow: 3px 3px 0 " + BLACK + "; }",
    ".__cmt_panel .foot .copy:hover { background: " + HAZARD_DARK + "; }",
    ".__cmt_panel .foot .copy:active { transform: translate(1px, 1px); box-shadow: 2px 2px 0 " +
      BLACK +
      "; }",
    ".__cmt_panel .foot button svg { width: 14px !important; height: 14px !important; flex-shrink: 0; }",

    // ============================================================
    // FLOATING NUMBER BADGES — hazard stickers
    // ============================================================
    ".__cmt_badge { position: absolute; z-index: 2147483645;",
    "  width: 24px; height: 24px; border-radius: 50%;",
    "  background: " + HAZARD + "; border: 2.5px solid " + BLACK + ";",
    "  color: " + BLACK + "; font-family: " + FONT_STACK + " !important;",
    "  font-weight: 900 !important; font-size: 12px; line-height: 1; cursor: pointer;",
    "  display: flex; align-items: center; justify-content: center;",
    "  box-shadow: 2px 2px 0 " + BLACK + ";",
    "  animation: __cmt_slamIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;",
    "  transition: transform 0.12s, box-shadow 0.12s, background 0.12s; }",
    ".__cmt_badge:hover { transform: scale(1.2) rotate(-6deg);",
    "  box-shadow: 3px 3px 0 " + BLACK + "; background: " + HAZARD_DARK + "; }",

    // toast
    "#__cmt_flash { position: fixed; top: 70px; right: 16px; z-index: 2147483647;",
    "  background: white; color: " +
      BLACK +
      "; padding: 10px 16px; border-radius: 4px;",
    "  border: 2px solid " + BLACK + "; box-shadow: 3px 3px 0 " + BLACK + ";",
    "  font-weight: 800 !important; font-size: 12px !important;",
    "  text-transform: uppercase !important; letter-spacing: 0.04em !important;",
    "  animation: __cmt_slamIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both; }",

    // copy success + exit animations
    "#__cmt_toolbar button.__cmt_success, .__cmt_panel .foot button.__cmt_success {",
    "  background: " +
      SUCCESS +
      " !important; color: " +
      BLACK +
      " !important; pointer-events: none;",
    "  border-color: " + BLACK + " !important;",
    "  animation: __cmt_pop 0.4s ease; transition: background 0.25s, color 0.25s; }",
    "#__cmt_toolbar.__cmt_exiting, #__cmt_popup.__cmt_exiting, .__cmt_panel.__cmt_exiting {",
    "  animation: __cmt_fadeOut 0.35s cubic-bezier(0.4, 0, 1, 1) forwards;",
    "  pointer-events: none; }",
    ".__cmt_badge.__cmt_exiting {",
    "  animation: __cmt_fadeOut 0.25s ease forwards; pointer-events: none; }",

    // ============================================================
    // HISTORY — session rows reuse .__cmt_card; a few extras
    // ============================================================
    "#__cmt_history_panel .stitle { font-weight: 800 !important; font-size: 13px !important;",
    "  color: " +
      BLACK +
      " !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    "  line-height: 1.3 !important; }",
    "#__cmt_history_panel .smeta { font-size: 11px !important; opacity: 0.6; margin-top: 4px;",
    "  font-weight: 600 !important; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }",
    ".__cmt_srow .chip { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 999px;",
    "  border: 1.5px solid " +
      BLACK +
      "; font-size: 10px !important; font-weight: 800 !important;",
    "  text-transform: uppercase !important; letter-spacing: 0.04em !important; opacity: 1; }",
    ".__cmt_srow .chip.open { background: " + HAZARD + "; }",
    ".__cmt_srow .chip.copied { background: " + SUCCESS + "; }",
    ".__cmt_srow .chip.draft { background: #fff; }",
    "#__cmt_history_panel .foot .newbtn { background: #fff; color: " +
      BLACK +
      "; }",
    "#__cmt_history_panel .foot .newbtn:hover { background: " + HAZARD + "; }",
    ".__cmt_card .host { display: inline-block; font-size: 10px !important; font-weight: 700 !important;",
    "  color: " +
      BLACK +
      " !important; opacity: 0.5; margin-bottom: 5px; max-width: 100%;",
    "  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ].join("\n");
  document.head.appendChild(style);

  // SVG icons — width/height set inline so host CSS can't enlarge them
  var ICON = {
    list: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    flag: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    close:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    edit: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    trash:
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    check:
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    grip: '<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="2" cy="2" r="1.4"/><circle cx="8" cy="2" r="1.4"/><circle cx="2" cy="7" r="1.4"/><circle cx="8" cy="7" r="1.4"/><circle cx="2" cy="12" r="1.4"/><circle cx="8" cy="12" r="1.4"/></svg>',
    history:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
    plus: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  };

  // -------------------------------------------------------------- toolbar
  var toolbar = document.createElement("div");
  toolbar.id = "__cmt_toolbar";
  toolbar.innerHTML =
    '<span class="grip" title="Drag to move">' +
    ICON.grip +
    "</span>" +
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

  document
    .getElementById("__cmt_history")
    .addEventListener("click", toggleHistory);
  document.getElementById("__cmt_view").addEventListener("click", togglePanel);
  document.getElementById("__cmt_copy").addEventListener("click", copyAndExit);
  document
    .getElementById("__cmt_cancel")
    .addEventListener("click", confirmCancel);

  // ---------------------------------------------------------------- drag
  toolbar.addEventListener("mousedown", onDragStart);

  function onDragStart(e) {
    if (e.target.closest("button")) return;
    if (e.button !== 0) return;
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
    toolbar.classList.remove("__cmt_dragging");
  }
  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd);

  // ---------------------------------------------------- selector helpers
  function cssSelector(el) {
    if (!(el instanceof Element)) return "";
    if (el.id) return "#" + CSS.escape(el.id);
    var path = [];
    var cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      var part = cur.tagName.toLowerCase();
      if (cur.className && typeof cur.className === "string") {
        var cls = cur.className
          .trim()
          .split(/\s+/)
          .filter(function (c) {
            return c && c.indexOf("__cmt_") !== 0;
          })
          .slice(0, 2);
        if (cls.length) part += "." + cls.map(CSS.escape).join(".");
      }
      var parent = cur.parentNode;
      if (parent) {
        var sibs = Array.prototype.filter.call(parent.children, function (c) {
          return c.tagName === cur.tagName;
        });
        if (sibs.length > 1)
          part += ":nth-of-type(" + (sibs.indexOf(cur) + 1) + ")";
      }
      path.unshift(part);
      cur = cur.parentElement;
    }
    return path.join(" > ");
  }

  function elementSummary(el) {
    var tag = el.tagName.toLowerCase();
    var text = (el.textContent || "").trim().slice(0, 80).replace(/\s+/g, " ");
    return "<" + tag + ">" + text + "</" + tag + ">";
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
    if (isOurUI(e.target)) return;
    if (STATE.popup) return;
    e.preventDefault();
    e.stopPropagation();
    selectElement(e.target, e.clientX, e.clientY);
  }

  document.addEventListener("mouseover", onMouseOver, true);
  document.addEventListener("mouseout", onMouseOut, true);
  document.addEventListener("click", onClick, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);

  function onScroll() {
    repositionBadges();
    repositionOpenBoxes();
  }
  function onResize() {
    repositionBadges();
    repositionOpenBoxes();
  }

  // ---------------------------------------------------- flag popup
  function selectElement(el, mouseX, mouseY) {
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

  function saveFlag(text, x, y) {
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
    if (STATE.panelOpen) renderPanel();
    persist();
  }

  function cancelFlag() {
    closePopup();
  }
  function closePopup() {
    if (STATE.selectedEl) STATE.selectedEl.classList.remove("__cmt_selected");
    STATE.selectedEl = null;
    if (STATE.popup) {
      STATE.popup.remove();
      STATE.popup = null;
    }
  }

  // ---------------------------------------------------- element badges
  function addBadge(c) {
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

  function repositionBadges() {
    STATE.flags.forEach(function (c) {
      if (!c.badge || !c.el || !c.el.isConnected) return;
      var r = c.el.getBoundingClientRect();
      c.badge.style.top = window.scrollY + r.top - 9 + "px";
      c.badge.style.left = window.scrollX + r.right - 15 + "px";
    });
  }

  function renumberBadges() {
    STATE.flags.forEach(function (c, i) {
      if (c.badge) c.badge.textContent = i + 1;
    });
  }

  // ---------------------------------------------------- flags panel
  function togglePanel() {
    if (STATE.panelOpen) closePanel();
    else openPanel();
  }

  function openPanel() {
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

  function closePanel() {
    if (STATE.panel) STATE.panel.remove();
    STATE.panel = null;
    STATE.panelOpen = false;
  }

  function positionBox(box) {
    if (!box) return;
    var t = toolbar.getBoundingClientRect();
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

  function positionPanel() {
    if (STATE.panel) positionBox(STATE.panel);
  }
  function repositionOpenBoxes() {
    if (STATE.panelOpen) positionBox(STATE.panel);
    if (STATE.historyOpen) positionBox(STATE.history);
  }

  function renderPanel() {
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

  function startEdit(card, c) {
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
    actions
      .querySelector(".cancel-edit")
      .addEventListener("click", function () {
        renderPanel();
      });
    actions.querySelector(".save").addEventListener("click", function () {
      commitEdit(c, ta.value);
    });
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
        commitEdit(c, ta.value);
      if (e.key === "Escape") renderPanel();
    });
  }

  function commitEdit(c, text) {
    var t = (text || "").trim();
    if (!t) {
      removeFlag(c);
      return;
    }
    c.text = t;
    renderPanel();
    persist();
  }

  function removeFlag(c) {
    var idx = STATE.flags.indexOf(c);
    if (idx === -1) return;
    STATE.flags.splice(idx, 1);
    if (c.badge) c.badge.remove();
    renumberBadges();
    updateCount();
    renderPanel();
    persist();
  }

  function locateFlag(c) {
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

  function showFlag(c) {
    if (!STATE.panelOpen) openPanel();
    setTimeout(function () {
      if (!STATE.panel) return;
      var card = STATE.panel.querySelector(
        '.__cmt_card[data-id="' + c.id + '"]',
      );
      if (!card) return;
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("__cmt_highlight");
      setTimeout(function () {
        card.classList.remove("__cmt_highlight");
      }, 1500);
    }, 30);
  }

  function updateCount() {
    var n = STATE.flags.length;
    var el = document.getElementById("__cmt_count_label");
    if (el) {
      el.textContent = n;
      el.classList.toggle("empty", n === 0);
    }
    var pc = document.getElementById("__cmt_panel_count");
    if (pc) pc.textContent = n;
  }

  // ============================================================
  // SESSIONS — persistence + history (chrome.storage.local)
  // ============================================================
  var STORE_KEY = "__flagger_store_v1";

  function hasStorage() {
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
    return (
      "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    );
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
  function persist() {
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
  function finishSession() {
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
  function newSession() {
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
  function reopenSession(id) {
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
  function deleteSession(id) {
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

  function initSessions() {
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
      } else if (STATE.flags.length) {
        persist(); // user flagged before storage finished loading
      }
    });
  }

  // -------------------------------------------------- session formatting
  function hostOf(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url || "";
    }
  }
  function uniqueHosts(flags) {
    var seen = {},
      out = [];
    (flags || []).forEach(function (f) {
      var h = hostOf(f.url);
      if (h && !seen[h]) {
        seen[h] = 1;
        out.push(h);
      }
    });
    return out;
  }
  function uniqueUrlCount(flags) {
    var seen = {},
      n = 0;
    (flags || []).forEach(function (f) {
      if (f.url && !seen[f.url]) {
        seen[f.url] = 1;
        n++;
      }
    });
    return n;
  }
  function sessionTitle(s) {
    if (s.title) return s.title;
    var hosts = uniqueHosts(s.flags);
    if (!hosts.length) return "Empty session";
    return hosts[0] + (hosts.length > 1 ? " +" + (hosts.length - 1) : "");
  }
  function relTime(ts) {
    if (!ts) return "";
    var s = Math.round((Date.now() - ts) / 1000);
    if (s < 45) return "just now";
    var m = Math.round(s / 60);
    if (m < 60) return m + "m ago";
    var h = Math.round(m / 60);
    if (h < 24) return h + "h ago";
    var d = Math.round(h / 24);
    if (d < 7) return d + "d ago";
    try {
      return new Date(ts).toLocaleDateString();
    } catch (e) {
      return "";
    }
  }

  // Copy a session straight from the history list — no need to open it.
  function quickCopy(session) {
    var md = buildMarkdownFrom(session.flags);
    if (!md) {
      flash("Session is empty", DANGER);
      return;
    }
    var n = session.flags.length;
    var done = function (ok) {
      flash(
        ok ? "Copied " + n + " flag" + (n === 1 ? "" : "s") : "Copy failed",
        ok ? null : DANGER,
      );
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).then(
        function () {
          done(true);
        },
        function () {
          fallbackCopy(md, done);
        },
      );
    } else {
      fallbackCopy(md, done);
    }
  }

  // -------------------------------------------------- history panel
  function toggleHistory() {
    if (STATE.historyOpen) closeHistory();
    else openHistory();
  }
  function openHistory() {
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
  function closeHistory() {
    if (STATE.history) STATE.history.remove();
    STATE.history = null;
    STATE.historyOpen = false;
  }

  function renderHistory() {
    var list = document.getElementById("__cmt_hist_list");
    if (!list) return;
    var sessions = (STATE.store ? STATE.store.sessions : []).filter(
      function (s) {
        return s.flags && s.flags.length;
      },
    );
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

  // ---------------------------------------------------- output + cleanup
  function buildMarkdownFrom(flags) {
    if (!flags || !flags.length) return "";
    return flags
      .map(function (c, i) {
        return [
          "## Flag " + (i + 1),
          "- URL: " + c.url,
          "- Selector: `" + c.selector + "`",
          "- Element: `" + c.summary + "`",
          "- Position: " + c.x + ", " + c.y,
          "",
          c.text
            .split("\n")
            .map(function (l) {
              return "> " + l;
            })
            .join("\n"),
        ].join("\n");
      })
      .join("\n\n");
  }
  function buildMarkdown() {
    return buildMarkdownFrom(STATE.flags);
  }

  function copyAndExit() {
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
        if (toolbar) toolbar.classList.add("__cmt_exiting");
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
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).then(
        function () {
          done(true);
        },
        function () {
          fallbackCopy(md, done);
        },
      );
    } else {
      fallbackCopy(md, done);
    }
  }

  function fallbackCopy(md, done) {
    var ta = document.createElement("textarea");
    ta.value = md;
    ta.style.cssText =
      "position:fixed;top:10px;left:10px;width:80vw;height:60vh;z-index:2147483647;";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    ta.remove();
    done(ok);
  }

  function confirmCancel() {
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

  function flash(msg, color) {
    var existing = document.getElementById("__cmt_flash");
    if (existing) existing.remove();
    var el = document.createElement("div");
    el.id = "__cmt_flash";
    el.textContent = msg;
    if (color) {
      el.style.background = color;
      el.style.color = "white";
      el.style.borderColor = BLACK;
    }
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.remove();
    }, 1800);
  }

  function cleanup() {
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
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
    if (toolbar.parentNode) toolbar.remove();
    if (STATE.popup) STATE.popup.remove();
    if (STATE.panel) STATE.panel.remove();
    if (STATE.history) STATE.history.remove();
    if (style.parentNode) style.remove();
    delete window.__flaggerActive;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  // Kick off after every declaration above has been assigned (STORE_KEY etc.).
  initSessions();
})();
