// Injects the overlay's scoped stylesheet into the host page.
//
// The whole visual theme is expressed as CSS custom properties on
// `html.__cmt_root` (applied at mount), so every overlay element inherits it
// and a different theme can be swapped in later by changing this one block.
import { STATE } from "./state.js";

export function injectStyles() {
  var style = document.createElement("style");
  style.id = "__cmt_style";
  style.textContent = [
    // ============================================================
    // THEME TOKENS — "refined caution": warm charcoal + gold, sharp.
    // One block to swap later (e.g. a hi-vis or redline theme).
    // ============================================================
    "html.__cmt_root {",
    "  --cmt-surface: #1c1b18;",
    "  --cmt-surface-2: #26241f;",
    "  --cmt-surface-3: #322f28;",
    "  --cmt-line: rgba(255,255,255,0.10);",
    "  --cmt-line-2: rgba(255,255,255,0.16);",
    "  --cmt-text: #f2efe9;",
    "  --cmt-muted: #a29c8e;",
    "  --cmt-faint: #6f6a5e;",
    "  --cmt-accent: #f2b824;",
    "  --cmt-accent-press: #d9a318;",
    "  --cmt-accent-edge: #caa017;",
    "  --cmt-on-accent: #2a2305;",
    "  --cmt-accent-soft: rgba(242,184,36,0.16);",
    "  --cmt-accent-text: #e7b53a;",
    "  --cmt-pause: #f2b824;",
    "  --cmt-on-pause: #2a2305;",
    "  --cmt-danger: #e5544f;",
    "  --cmt-shadow: 0 16px 40px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08);",
    "  --cmt-shadow-sm: 0 10px 24px -6px rgba(0,0,0,0.45);",
    "  --cmt-radius: 12px;",
    "  --cmt-radius-md: 8px;",
    "  --cmt-radius-sm: 6px;",
    "  --cmt-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;",
    "  --cmt-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;",
    "  --cmt-ease: cubic-bezier(0.32, 0.72, 0, 1);",
    "}",

    // -------- font isolation: defeat host page styles
    "#__cmt_island, #__cmt_island *, #__cmt_popup, #__cmt_popup *, #__cmt_flash {",
    "  font-family: var(--cmt-font) !important;",
    "  font-style: normal !important; letter-spacing: normal !important;",
    "  line-height: 1.4 !important; text-shadow: none !important;",
    "  text-decoration: none !important; box-sizing: border-box !important;",
    "}",
    "#__cmt_popup .target, .__cmt_card .tag { font-family: var(--cmt-mono) !important; }",

    // -------- page hover / select outlines
    ".__cmt_outline { outline: 2px solid var(--cmt-accent) !important; outline-offset: 2px !important; cursor: crosshair !important; }",
    ".__cmt_selected { outline: 2px solid var(--cmt-accent) !important; outline-offset: 2px !important; }",
    "@keyframes __cmt_pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }",
    "@keyframes __cmt_fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }",
    "@keyframes __cmt_pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }",
    "@keyframes __cmt_in { from { opacity: 0; transform: translateY(10px) scale(0.95); } to { opacity: 1; transform: none; } }",
    ".__cmt_flash_anim { animation: __cmt_pulse 0.55s ease; }",

    // ============================================================
    // THE ISLAND — one morphing surface, anchored bottom-right
    // ============================================================
    "#__cmt_island { position: fixed; right: 18px; bottom: 18px; z-index: 2147483647;",
    "  width: 116px; height: 46px; border-radius: 13px;",
    "  background: var(--cmt-surface); color: var(--cmt-text);",
    "  border: 1px solid var(--cmt-line-2); box-shadow: var(--cmt-shadow); overflow: hidden;",
    "  font-size: 13px; user-select: none;",
    "  transition: width 0.42s var(--cmt-ease), height 0.42s var(--cmt-ease), background 0.25s ease;",
    "  animation: __cmt_in 0.45s var(--cmt-ease) both; }",
    "#__cmt_island.__cmt_open { width: 340px; }",

    // -------- card content (header / list / footer-left). Hidden until open.
    "#__cmt_card { position: absolute; inset: 0; z-index: 1; opacity: 0;",
    "  pointer-events: none; transition: opacity 0.2s ease 0.1s; }",
    "#__cmt_island.__cmt_open #__cmt_card { opacity: 1; pointer-events: auto; }",

    // header
    ".__cmt_hd { position: absolute; top: 0; left: 0; right: 0; height: 48px;",
    "  display: flex; align-items: center; gap: 4px; padding: 0 8px 0 16px;",
    "  border-bottom: 1px solid var(--cmt-line); cursor: grab; }",
    "#__cmt_island.__cmt_dragging, #__cmt_island.__cmt_dragging .__cmt_hd { cursor: grabbing; }",
    ".__cmt_hd .ttl { font-size: 14px !important; font-weight: 600 !important; color: var(--cmt-text); }",
    ".__cmt_hd .count { display: inline-flex; align-items: center; color: var(--cmt-accent);",
    "  font-size: 13px !important; font-weight: 600 !important; line-height: 1 !important; }",
    ".__cmt_hd .sp { flex: 1; }",
    ".__cmt_ib { display: inline-flex; align-items: center; justify-content: center;",
    "  width: 30px; height: 30px; border-radius: 8px; border: 0; background: transparent;",
    "  color: var(--cmt-muted); cursor: pointer; transition: background 0.15s, color 0.15s; }",
    ".__cmt_ib:hover { background: var(--cmt-surface-2); color: var(--cmt-text); }",
    "#__cmt_close:hover { background: rgba(240,103,106,0.16); color: var(--cmt-danger); }",
    ".__cmt_ib svg { width: 16px; height: 16px; }",

    // list
    "#__cmt_panel_list { position: absolute; top: 48px; bottom: 46px; left: 0; right: 0;",
    "  overflow-y: auto; padding: 10px 10px 6px; }",
    "#__cmt_panel_list .empty { color: var(--cmt-muted) !important; text-align: center;",
    "  padding: 34px 16px; font-size: 13px !important; line-height: 1.6 !important; }",
    "#__cmt_panel_list .empty strong { display: block; font-size: 13.5px !important;",
    "  font-weight: 600 !important; color: var(--cmt-text); margin-bottom: 5px; }",

    // footer-left button (Copy & exit, or New session). Right edge clears Pause.
    "#__cmt_footL { position: absolute; bottom: 0; left: 0; right: 116px; height: 46px; padding: 7px 8px; }",
    "#__cmt_footL button { width: 100%; height: 100%; border: 0; cursor: pointer; border-radius: 8px;",
    "  display: inline-flex; align-items: center; justify-content: center; gap: 7px;",
    "  font-family: var(--cmt-font) !important; font-size: 12.5px !important; font-weight: 600 !important;",
    "  transition: background 0.14s, box-shadow 0.14s; line-height: 1; }",
    "#__cmt_footL .copy { background: linear-gradient(180deg, #f6c63e, #efb31d); color: var(--cmt-on-accent);",
    "  border: 1px solid var(--cmt-accent-edge);",
    "  box-shadow: inset 0 1px 0 rgba(255,255,255,0.42), 0 1px 2px rgba(0,0,0,0.35); }",
    "#__cmt_footL .copy:hover { background: linear-gradient(180deg, #f8cb4a, #f2b824); }",
    "#__cmt_footL .copy:active { box-shadow: inset 0 1px 2px rgba(0,0,0,0.2); }",
    "#__cmt_footL .newbtn { background: rgba(255,255,255,0.03); color: var(--cmt-text); border: 1px solid var(--cmt-line-2); }",
    "#__cmt_footL .newbtn:hover { background: var(--cmt-surface-3); }",
    "#__cmt_footL button svg { width: 15px; height: 15px; }",

    // -------- the Pause anchor: bottom-right. It IS the compact pill AND the
    // footer's second button. Transparent itself; its layers fill the pill when
    // compact and morph into an inset button (matching Copy) when the card opens.
    "#__cmt_pause { position: absolute; right: 0; bottom: 0; z-index: 2;",
    "  width: 116px; height: 46px; border: 0; padding: 0; cursor: pointer; background: transparent;",
    "  transition: width 0.3s var(--cmt-ease); }",
    "#__cmt_pause .__cmt_lyr { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;",
    "  gap: 7px; box-sizing: border-box; border: 1px solid transparent; border-radius: 0; opacity: 0;",
    "  transition: opacity 0.16s ease, top 0.32s var(--cmt-ease), bottom 0.32s var(--cmt-ease),",
    "    left 0.32s var(--cmt-ease), right 0.32s var(--cmt-ease), background 0.2s ease, border-color 0.2s ease, border-radius 0.2s ease; }",
    "#__cmt_pause .__cmt_lyr svg { width: 16px; height: 16px; }",
    "#__cmt_pause .__cmt_lyr .n { font-size: 13px !important; font-weight: 600 !important; }",
    // layer identities: compact marker (flag + count), Pause label, Resume label
    "#__cmt_pause .rest { opacity: 1; } #__cmt_pause .rest svg { color: var(--cmt-accent); }",
    "#__cmt_pause .rest .n { color: var(--cmt-text); }",
    "#__cmt_pause .pause { color: var(--cmt-text); } #__cmt_pause .pause svg { color: var(--cmt-accent); }",
    "#__cmt_pause .browse { color: var(--cmt-on-pause); } #__cmt_pause .browse svg { color: var(--cmt-on-pause); }",
    // which layer is visible across states
    "#__cmt_island.__cmt_hot #__cmt_pause .rest, #__cmt_island.__cmt_open #__cmt_pause .rest,",
    "#__cmt_island.__cmt_paused #__cmt_pause .rest { opacity: 0; }",
    "#__cmt_island.__cmt_hot:not(.__cmt_paused) #__cmt_pause .pause,",
    "#__cmt_island.__cmt_open:not(.__cmt_paused) #__cmt_pause .pause { opacity: 1; }",
    "#__cmt_island.__cmt_paused #__cmt_pause .browse { opacity: 1; }",
    // compact + paused: Resume is a solid gold inset button, not a filled slab
    "#__cmt_island.__cmt_paused:not(.__cmt_open) #__cmt_pause .browse { top: 7px; bottom: 7px; left: 7px; right: 7px;",
    "  border-radius: 8px; background: linear-gradient(180deg, #f6c63e, #efb31d); border: 1px solid var(--cmt-accent-edge);",
    "  box-shadow: inset 0 1px 0 rgba(255,255,255,0.42), 0 1px 2px rgba(0,0,0,0.3); }",
    // open: Pause / Resume become inset buttons that match Copy — never a cell
    "#__cmt_island.__cmt_open #__cmt_pause .pause { top: 7px; bottom: 7px; left: 6px; right: 8px;",
    "  border-radius: 8px; background: rgba(255,255,255,0.04); border-color: var(--cmt-line-2); }",
    "#__cmt_island.__cmt_open #__cmt_pause:hover .pause { background: var(--cmt-surface-3); }",
    "#__cmt_island.__cmt_open.__cmt_paused #__cmt_pause .browse { top: 7px; bottom: 7px; left: 6px; right: 8px;",
    "  border-radius: 8px; background: rgba(242,184,36,0.13); border-color: rgba(242,184,36,0.5); color: var(--cmt-accent); }",
    "#__cmt_island.__cmt_open.__cmt_paused #__cmt_pause:hover .browse { background: rgba(242,184,36,0.22); }",
    "#__cmt_island.__cmt_open.__cmt_paused #__cmt_pause .browse svg { color: var(--cmt-accent); }",

    // -------- quick close: Esc extends the pill left to reveal a red button
    // with the ✕ and an inline 'Esc' label to its right.
    "#__cmt_quickclose { position: absolute; left: 8px; bottom: 7px; z-index: 3; width: 62px; height: 32px; padding: 0;",
    "  border-radius: 8px; cursor: pointer; background: var(--cmt-danger); color: #fff; border: 1px solid #cf4a45;",
    "  box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.3);",
    "  display: flex; align-items: center; justify-content: center; gap: 6px; opacity: 0; pointer-events: none;",
    "  transition: opacity 0.16s ease, background 0.14s ease; }",
    "#__cmt_quickclose svg { width: 15px; height: 15px; }",
    "#__cmt_quickclose .k { font-size: 11px !important; font-weight: 600 !important; color: rgba(255,255,255,0.92); }",
    "#__cmt_quickclose:hover { background: #d3443f; }",
    "#__cmt_island.__cmt_armed:not(.__cmt_open) { width: 134px; }",
    "#__cmt_island.__cmt_armed:not(.__cmt_open) #__cmt_pause { width: 56px; }",
    "#__cmt_island.__cmt_armed:not(.__cmt_open) #__cmt_quickclose { opacity: 1; pointer-events: auto; }",
    // paused + armed: extend the parent so Resume keeps its natural size (not
    // compressed) and both buttons get even padding
    "#__cmt_island.__cmt_armed.__cmt_paused:not(.__cmt_open) { width: 180px; }",
    "#__cmt_island.__cmt_armed.__cmt_paused:not(.__cmt_open) #__cmt_pause { width: 110px; }",

    // ============================================================
    // FLAG CARDS (inside the list)
    // ============================================================
    ".__cmt_card { padding: 11px 9px 12px; cursor: pointer; transition: background 0.14s;",
    "  animation: __cmt_fadeIn 0.16s ease both; }",
    ".__cmt_card:not(:first-child) { border-top: 1px solid var(--cmt-line); }",
    ".__cmt_card:hover { background: rgba(255,255,255,0.03); }",
    ".__cmt_card.editing { cursor: default; background: rgba(255,255,255,0.03); }",
    ".__cmt_card.__cmt_highlight { background: var(--cmt-accent-soft); }",
    ".__cmt_card .host { display: flex; align-items: center; gap: 4px; font-size: 10.5px !important;",
    "  font-weight: 500 !important; color: var(--cmt-faint) !important; margin: 0 0 5px 2px; max-width: 100%;",
    "  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
    ".__cmt_card .top { display: flex; align-items: flex-start; gap: 11px; }",
    ".__cmt_card .num { width: 20px; height: 20px; border-radius: 50%; background: var(--cmt-accent);",
    "  color: var(--cmt-on-accent); font-size: 11px !important; font-weight: 600 !important;",
    "  display: flex; align-items: center; justify-content: center; flex-shrink: 0;",
    "  line-height: 1 !important; margin-top: 1px; }",
    ".__cmt_card .body { color: var(--cmt-text) !important; font-size: 13.5px !important;",
    "  line-height: 1.5 !important; font-weight: 400 !important;",
    "  white-space: pre-wrap; word-break: break-word; flex: 1; min-width: 0; }",
    ".__cmt_card .meta { display: flex; align-items: center; gap: 8px; margin-top: 7px; padding-left: 31px; }",
    ".__cmt_card .tag { font-family: var(--cmt-mono) !important; font-size: 11px !important;",
    "  color: var(--cmt-muted) !important; flex: 1; min-width: 0;",
    "  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4 !important; font-weight: 400 !important; }",
    ".__cmt_card .actions { display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity 0.14s; }",
    ".__cmt_card:hover .actions, .__cmt_card.editing .actions { opacity: 1; }",
    ".__cmt_card .actions button { background: transparent; border: 0; color: var(--cmt-muted); cursor: pointer;",
    "  width: 26px; height: 26px; padding: 0; border-radius: 6px;",
    "  display: inline-flex; align-items: center; justify-content: center; transition: background 0.14s, color 0.14s; }",
    ".__cmt_card .actions button:hover { background: rgba(255,255,255,0.06); color: var(--cmt-text); }",
    ".__cmt_card .actions button.danger:hover { background: rgba(229,84,79,0.16); color: var(--cmt-danger); }",
    ".__cmt_card .actions button.cancel-edit { width: auto; padding: 0 9px; height: 28px;",
    "  font-family: var(--cmt-font) !important; font-size: 11.5px !important; font-weight: 500 !important; }",
    ".__cmt_card .actions button.save { width: auto; padding: 0 11px; height: 28px; gap: 5px;",
    "  background: linear-gradient(180deg, #f6c63e, #efb31d); color: var(--cmt-on-accent);",
    "  border: 1px solid var(--cmt-accent-edge); box-shadow: inset 0 1px 0 rgba(255,255,255,0.42);",
    "  font-family: var(--cmt-font) !important; font-size: 11.5px !important; font-weight: 600 !important; }",
    ".__cmt_card .actions button.save:hover { background: linear-gradient(180deg, #f8cb4a, #f2b824); color: var(--cmt-on-accent); }",
    ".__cmt_card .actions svg { width: 14px !important; height: 14px !important; flex-shrink: 0; }",
    ".__cmt_card textarea { width: 100%; min-height: 64px; padding: 8px 10px; margin-top: 2px;",
    "  border-radius: var(--cmt-radius-sm); border: 0.5px solid var(--cmt-line-2);",
    "  background: var(--cmt-surface); color: var(--cmt-text); resize: vertical; outline: none;",
    "  font-size: 13px !important; line-height: 1.5 !important; font-weight: 400 !important; transition: border-color 0.14s; }",
    ".__cmt_card textarea:focus { border-color: var(--cmt-accent); }",

    // history rows
    "#__cmt_panel_list .stitle { font-weight: 600 !important; font-size: 13px !important; color: var(--cmt-text) !important;",
    "  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3 !important; }",
    "#__cmt_panel_list .smeta { font-size: 11px !important; color: var(--cmt-muted); margin-top: 4px;",
    "  font-weight: 400 !important; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }",
    ".__cmt_srow .chip { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 999px;",
    "  font-size: 10px !important; font-weight: 600 !important; }",
    ".__cmt_srow .chip.open { background: var(--cmt-accent); color: var(--cmt-on-accent); }",
    ".__cmt_srow .chip.copied { background: var(--cmt-surface); color: var(--cmt-muted); }",
    ".__cmt_srow .chip.draft { background: var(--cmt-surface); color: var(--cmt-faint); }",

    // ============================================================
    // ON-PAGE NUMBER BADGES
    // ============================================================
    // The pin IS the card: ONE element morphs from the numbered tag into the
    // comment. It grows out from the tag's corner; the tag stays put at the pin.
    ".__cmt_badge { position: absolute; z-index: 2147483645; box-sizing: border-box;",
    "  width: 22px; height: 22px; border-radius: 12px; background: transparent;",
    "  border: 1px solid transparent;",
    "  transition: width 0.3s var(--cmt-ease), height 0.3s var(--cmt-ease),",
    "    background 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease, transform 0.3s var(--cmt-ease); }",
    ".__cmt_badge.open { z-index: 2147483646; width: 258px; border-radius: 12px; overflow: hidden;",
    "  background: var(--cmt-surface); border-color: var(--cmt-line-2); box-shadow: var(--cmt-shadow); }",
    ".__cmt_pinnum { position: absolute; top: 0; left: 0; z-index: 2; width: 22px; height: 22px; border-radius: 50%;",
    "  background: var(--cmt-accent); color: var(--cmt-on-accent); cursor: pointer;",
    "  font-family: var(--cmt-font) !important; font-weight: 600 !important; font-size: 11px; line-height: 1;",
    "  display: flex; align-items: center; justify-content: center;",
    "  box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.85);",
    "  animation: __cmt_pop 0.3s var(--cmt-ease) both; transition: box-shadow 0.2s ease, transform 0.12s ease; }",
    ".__cmt_badge.cl-left .__cmt_pinnum { left: auto; right: 0; }",
    ".__cmt_badge.cl-up .__cmt_pinnum { top: auto; bottom: 0; }",
    ".__cmt_badge:not(.open):hover .__cmt_pinnum { transform: scale(1.14); }",
    ".__cmt_badge.open .__cmt_pinnum { box-shadow: none; }",
    // the note, revealed as the tag grows; a corner band clears the number
    ".__cmt_comment { position: absolute; top: 0; left: 0; width: 258px; box-sizing: border-box;",
    "  padding: 30px 13px 12px; opacity: 0; pointer-events: none; transition: opacity 0.16s ease; }",
    ".__cmt_badge.cl-up .__cmt_comment { padding: 12px 13px 30px; }",
    ".__cmt_badge.open .__cmt_comment { opacity: 1; pointer-events: auto; transition: opacity 0.2s ease 0.1s; }",
    ".__cmt_comment .ctext { font-family: var(--cmt-font) !important; font-size: 13px !important;",
    "  line-height: 1.55 !important; color: var(--cmt-text); white-space: pre-wrap; word-break: break-word; }",
    ".__cmt_comment .ctag { font-family: var(--cmt-mono) !important; font-size: 10.5px !important;",
    "  color: var(--cmt-faint); margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
    ".__cmt_comment .cacts { display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 11px; }",
    ".__cmt_comment .cacts button { display: inline-flex; align-items: center; gap: 5px; cursor: pointer;",
    "  background: var(--cmt-surface-2); border: 0.5px solid var(--cmt-line-2); color: var(--cmt-muted);",
    "  border-radius: 6px; padding: 5px 9px; line-height: 1;",
    "  font-family: var(--cmt-font) !important; font-size: 11.5px !important; font-weight: 500 !important;",
    "  transition: background 0.14s, color 0.14s; }",
    ".__cmt_comment .cacts button:hover { background: var(--cmt-surface-3); color: var(--cmt-text); }",
    ".__cmt_comment .cacts .cdel { padding: 5px 7px; }",
    ".__cmt_comment .cacts .cdel:hover { background: rgba(229,84,79,0.16); color: var(--cmt-danger); border-color: transparent; }",
    ".__cmt_comment .cacts .csave { background: var(--cmt-accent); color: var(--cmt-on-accent); border-color: transparent; }",
    ".__cmt_comment .cacts .csave:hover { background: var(--cmt-accent-press); color: var(--cmt-on-accent); }",
    ".__cmt_comment .cacts button svg { width: 12px; height: 12px; }",
    ".__cmt_comment textarea { width: 100%; min-height: 64px; padding: 8px 10px; box-sizing: border-box;",
    "  border-radius: 6px; border: 0.5px solid var(--cmt-line-2); background: var(--cmt-surface-2);",
    "  color: var(--cmt-text); resize: vertical; outline: none;",
    "  font-family: var(--cmt-font) !important; font-size: 13px !important; line-height: 1.5 !important;",
    "  transition: border-color 0.14s; }",
    ".__cmt_comment textarea:focus { border-color: var(--cmt-accent); }",

    // ============================================================
    // POPUP — the "why flag this?" note dialog
    // ============================================================
    "#__cmt_popup { position: absolute; z-index: 2147483647; background: var(--cmt-surface);",
    "  color: var(--cmt-text); border: 0.5px solid var(--cmt-line-2); border-radius: var(--cmt-radius-md);",
    "  padding: 13px; width: 330px; font-size: 13px; box-shadow: var(--cmt-shadow);",
    "  animation: __cmt_fadeIn 0.18s ease both; }",
    "#__cmt_popup .target { font-size: 11px !important; color: var(--cmt-muted) !important;",
    "  background: var(--cmt-surface-2); padding: 6px 9px; border-radius: var(--cmt-radius-sm); margin-bottom: 10px;",
    "  word-break: break-all; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    "  line-height: 1.4 !important; font-weight: 400 !important; }",
    "#__cmt_popup textarea { width: 100%; min-height: 84px; padding: 10px 12px; border-radius: var(--cmt-radius-sm);",
    "  border: 0.5px solid var(--cmt-line-2); resize: vertical; background: var(--cmt-surface-2);",
    "  color: var(--cmt-text); outline: none; font-size: 13.5px !important; line-height: 1.5 !important;",
    "  font-weight: 400 !important; transition: border-color 0.14s; }",
    "#__cmt_popup textarea::placeholder { color: var(--cmt-faint); }",
    "#__cmt_popup textarea:focus { border-color: var(--cmt-accent); }",
    "#__cmt_popup .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 11px; align-items: center; }",
    "#__cmt_popup .hint { flex: 1; font-size: 10.5px !important; color: var(--cmt-faint) !important; font-weight: 400 !important; }",
    "#__cmt_popup button { font-size: 12.5px !important; padding: 7px 14px; border-radius: var(--cmt-radius-sm);",
    "  cursor: pointer; font-weight: 600 !important; line-height: 1; border: 0.5px solid transparent; transition: background 0.14s; }",
    "#__cmt_popup button.save { background: var(--cmt-accent); color: var(--cmt-on-accent); }",
    "#__cmt_popup button.save:hover { background: var(--cmt-accent-press); }",
    "#__cmt_popup button.cancel { background: var(--cmt-surface-2); color: var(--cmt-text); border-color: var(--cmt-line); }",
    "#__cmt_popup button.cancel:hover { background: var(--cmt-surface-3); }",

    // ============================================================
    // TOAST
    // ============================================================
    "#__cmt_flash { position: fixed; right: 18px; bottom: 74px; z-index: 2147483647;",
    "  background: var(--cmt-surface); color: var(--cmt-text); padding: 9px 14px; border-radius: var(--cmt-radius-sm);",
    "  border: 0.5px solid var(--cmt-line-2); box-shadow: var(--cmt-shadow-sm);",
    "  font-family: var(--cmt-font) !important; font-weight: 500 !important; font-size: 12.5px !important;",
    "  animation: __cmt_fadeIn 0.2s ease both; }",
    "#__cmt_flash.__cmt_err { background: var(--cmt-danger); color: #fff; border-color: transparent; }",

    // ============================================================
    // FOLLOW modal — in-page dialog hosting the enable-follow iframe
    // ============================================================
    "#__cmt_modal_backdrop { position: fixed; inset: 0; z-index: 2147483647;",
    "  background: rgba(10,10,10,0.5); display: flex; align-items: center; justify-content: center;",
    "  animation: __cmt_fadeIn 0.15s ease both; }",
    "#__cmt_modal_backdrop iframe { width: 440px; max-width: calc(100vw - 32px); height: 250px; display: block;",
    "  border: 0.5px solid var(--cmt-line-2); border-radius: var(--cmt-radius); background: var(--cmt-surface);",
    "  box-shadow: var(--cmt-shadow); }",
  ].join("\n");
  document.head.appendChild(style);
  STATE.style = style;
}
