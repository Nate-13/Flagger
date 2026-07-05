// Framework component detection.
//
// The overlay runs in the extension's *isolated world*, which can't see the
// expando properties React/Vue attach to DOM nodes (fibers, component
// instances). So we inject a tiny probe into the page's MAIN world and talk to
// it over window.postMessage: when a flag is created we tag its element with a
// one-shot token, ask the probe to resolve the token, and fill in the flag's
// `component` when it answers.
//
// Best-effort: strict-CSP pages may block the injected <script>, and only dev
// builds carry real component names + source files. When anything is missing
// the `component` field simply stays empty and the brief is unaffected.
import { STATE } from "./state.js";
import { persist } from "./sessions.js";

// Runs in the page's main world. Kept dependency-free and self-guarding.
var PROBE_SRC = `(function () {
  if (window.__flaggerProbe) return;
  window.__flaggerProbe = 1;

  function reactFiber(el) {
    var keys = Object.keys(el);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.indexOf("__reactFiber$") === 0 ||
          k.indexOf("__reactInternalInstance$") === 0) return el[k];
    }
    return null;
  }
  function typeName(t) {
    if (!t || typeof t === "string") return "";
    var n = t.displayName || t.name ||
      (t.render && (t.render.displayName || t.render.name)) ||
      (t.type && (t.type.displayName || t.type.name));
    return typeof n === "string" ? n : "";
  }
  function react(el) {
    var f = reactFiber(el), name = "", src = "", depth = 0;
    while (f && depth < 50) {
      if (!name) {
        var n = typeName(f.type);
        if (n && /^[A-Z]/.test(n)) name = n; // skip host tags + minified names
      }
      if (!src && f._debugSource && f._debugSource.fileName) {
        src = f._debugSource.fileName +
          (f._debugSource.lineNumber ? ":" + f._debugSource.lineNumber : "");
      }
      if (name && src) break;
      f = f.return;
      depth++;
    }
    return name || src ? { name: name, src: src } : null;
  }
  function vue(el) {
    var inst = el.__vueParentComponent; // Vue 3
    if (inst && inst.type) {
      var t = inst.type;
      var n = t.__name || t.name || "";
      if (n || t.__file) return { name: n, src: t.__file || "" };
    }
    if (el.__vue__ && el.__vue__.$options) { // Vue 2
      var o = el.__vue__.$options;
      if (o.name || o.__file) return { name: o.name || "", src: o.__file || "" };
    }
    return null;
  }
  function detect(el) {
    try { return react(el) || vue(el) || null; } catch (e) { return null; }
  }

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.source !== "flagger-probe" || d.type !== "probe") return;
    var el = null;
    try { el = document.querySelector('[data-flg-probe="' + d.token + '"]'); }
    catch (e2) {}
    window.postMessage({
      source: "flagger-probe", type: "result", token: d.token,
      info: el ? detect(el) : null,
    }, "*");
  }, false);
})();`;

var installed = false;
var seq = 1;
var pending = {}; // token -> flag id awaiting a result

// Inject the main-world probe once. Silently degrades if the page's CSP blocks
// the inline script.
export function installProbe() {
  if (installed) return;
  installed = true;
  window.addEventListener("message", onMessage, false);
  try {
    var s = document.createElement("script");
    s.textContent = PROBE_SRC;
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (e) {
    /* CSP blocked — component detection just stays off */
  }
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
  persist(); // re-save with the component filled in (also re-renders)
}

// Ask the probe to resolve the component for a freshly-created flag.
export function probeComponent(flag) {
  if (!flag || !flag.el || !installed) return;
  var token = "p" + seq++ + "_" + flag.id;
  pending[token] = flag.id;
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
