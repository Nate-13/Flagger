// The main-world component probe.
//
// This runs in the PAGE's main world (injected by the background worker via
// chrome.scripting.executeScript with world:"MAIN"), because the frameworks'
// fibers/instances are expando properties on DOM nodes that the extension's
// isolated world can't see. It answers the isolated overlay over
// window.postMessage: given a one-shot token, it finds the tagged element,
// resolves its React/Vue component name (+ dev source file), and posts it back.
//
// Injecting from the background bypasses the page's CSP — an inline <script>
// added from the content script would be refused on strict-CSP pages.
(function () {
  if (window.__flaggerProbe) return;
  window.__flaggerProbe = 1;

  var DBG = false;
  try {
    DBG = localStorage.getItem("__flaggerDebug") === "1";
  } catch (e) {}
  function log() {
    if (DBG && window.console)
      console.debug.apply(
        console,
        ["[flagger/probe]"].concat([].slice.call(arguments)),
      );
  }
  log("main-world probe installed");

  function reactFiber(el) {
    var keys = Object.keys(el);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (
        k.indexOf("__reactFiber$") === 0 ||
        k.indexOf("__reactInternalInstance$") === 0
      )
        return el[k];
    }
    return null;
  }
  function typeName(t) {
    if (!t || typeof t === "string") return "";
    var n =
      t.displayName ||
      t.name ||
      (t.render && (t.render.displayName || t.render.name)) ||
      (t.type && (t.type.displayName || t.type.name));
    return typeof n === "string" ? n : "";
  }
  function react(el) {
    var f = reactFiber(el),
      name = "",
      src = "",
      depth = 0;
    while (f && depth < 50) {
      if (!name) {
        var n = typeName(f.type);
        if (n && /^[A-Z]/.test(n)) name = n; // skip host tags + minified names
      }
      if (!src && f._debugSource && f._debugSource.fileName) {
        src =
          f._debugSource.fileName +
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
    if (el.__vue__ && el.__vue__.$options) {
      // Vue 2
      var o = el.__vue__.$options;
      if (o.name || o.__file)
        return { name: o.name || "", src: o.__file || "" };
    }
    return null;
  }
  function detect(el) {
    try {
      return react(el) || vue(el) || null;
    } catch (e) {
      return null;
    }
  }

  window.addEventListener(
    "message",
    function (e) {
      var d = e.data;
      if (!d || d.source !== "flagger-probe" || d.type !== "probe") return;
      var el = null;
      try {
        el = document.querySelector('[data-flg-probe="' + d.token + '"]');
      } catch (e2) {}
      var info = el ? detect(el) : null;
      log(
        "probe request",
        d.token,
        "element:",
        el ? el.tagName : "MISSING",
        "fiber:",
        el ? !!reactFiber(el) : false,
        "info:",
        info,
      );
      window.postMessage(
        { source: "flagger-probe", type: "result", token: d.token, info: info },
        "*",
      );
    },
    false,
  );
})();
