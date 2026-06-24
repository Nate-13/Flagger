// Injects the overlay's scoped stylesheet into the host page.
import { STATE } from "./state.js";
import {
  HAZARD,
  HAZARD_DARK,
  BLACK,
  CREAM,
  DANGER,
  SUCCESS,
  FONT_STACK,
  MONO_STACK,
  STRIPE,
} from "./theme.js";

export function injectStyles() {
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
  STATE.style = style;
}
