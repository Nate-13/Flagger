// Framework component detection — the isolated-world half.
//
// The overlay runs in the extension's *isolated world*, which can't see the
// fibers/instances React/Vue attach to DOM nodes. The actual reading happens in
// a main-world probe (src/probe.js) that the background worker injects with
// world:"MAIN" (bypassing page CSP). This module just talks to it: when a flag
// is created we tag its element with a one-shot token and ask the probe, over
// window.postMessage, to resolve the component; the answer fills the flag's
// `component` field and re-persists.
//
// Best-effort: only dev builds carry real names + source files, and the probe
// may find nothing. When it does, the field is simply omitted.
import { STATE } from "./state.js";
import { persist } from "./sessions.js";

function dbg() {
  var on = false;
  try {
    on = localStorage.getItem("__flaggerDebug") === "1";
  } catch (e) {}
  if (on && window.console)
    console.debug.apply(
      console,
      ["[flagger/detect]"].concat([].slice.call(arguments)),
    );
}

var installed = false;
var seq = 1;
var pending = {}; // token -> flag id awaiting a result

// Start listening for probe answers. The main-world probe itself is injected by
// the background worker alongside the overlay.
export function installProbe() {
  if (installed) return;
  installed = true;
  window.addEventListener("message", onMessage, false);
  dbg("listening for probe results");
}

// Drop the isolated-world listener on teardown; the main-world probe persists
// (guarded), so a later re-mount just re-attaches this listener.
export function teardownProbe() {
  if (!installed) return;
  window.removeEventListener("message", onMessage, false);
  installed = false;
  pending = {};
}

function onMessage(e) {
  var d = e.data;
  if (!d || d.source !== "flagger-probe" || d.type !== "result") return;
  var flagId = pending[d.token];
  if (flagId === undefined) return;
  delete pending[d.token];
  dbg("result", d.token, d.info);
  if (!d.info) return;

  var flag = null;
  for (var i = 0; i < STATE.flags.length; i++) {
    if (STATE.flags[i].id === flagId) {
      flag = STATE.flags[i];
      break;
    }
  }
  if (!flag) return;

  var label = d.info.name ? "`<" + d.info.name + ">`" : "";
  if (d.info.src) label += (label ? " — " : "") + d.info.src;
  if (!label) return;
  flag.component = label;
  dbg("component set on flag", flag.id, label);
  persist(); // re-save with the component filled in (also re-renders)
}

// Ask the probe to resolve the component for a freshly-created flag.
export function probeComponent(flag) {
  if (!flag || !flag.el || !installed) return;
  var token = "p" + seq++ + "_" + flag.id;
  pending[token] = flag.id;
  dbg("requesting", token, "for flag", flag.id);
  try {
    flag.el.setAttribute("data-flg-probe", token);
    window.postMessage(
      { source: "flagger-probe", type: "probe", token: token },
      "*",
    );
  } catch (e) {}
  var el = flag.el;
  setTimeout(function () {
    try {
      el.removeAttribute("data-flg-probe");
    } catch (e) {}
    delete pending[token]; // give up if no answer came back
  }, 300);
}
