// Small DOM-agnostic helpers used across the overlay.

export function cssSelector(el) {
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

export function elementSummary(el) {
  var tag = el.tagName.toLowerCase();
  var text = (el.textContent || "").trim().slice(0, 80).replace(/\s+/g, " ");
  return "<" + tag + ">" + text + "</" + tag + ">";
}

// --- Flag context capture -------------------------------------------------
// Extra signal we hand to the agent so it can find the right code, kept lean:
// every helper returns "" when there's nothing worth saying, so the brief only
// grows for elements that actually carry the information.

// Identifying attributes an agent can grep for. Deliberately excludes the class
// list (utility-class frameworks turn that into noise).
var KEY_ATTRS = [
  "data-testid",
  "data-test",
  "data-cy",
  "data-qa",
  "name",
  "type",
  "role",
  "aria-label",
  "placeholder",
  "href",
  "alt",
  "title",
];
export function keyAttributes(el) {
  if (!(el instanceof Element)) return "";
  var out = [];
  KEY_ATTRS.forEach(function (a) {
    if (!el.hasAttribute(a)) return;
    var v = (el.getAttribute(a) || "").trim().replace(/\s+/g, " ");
    if (!v) return;
    if (v.length > 80) v = v.slice(0, 79) + "…";
    out.push(a + '="' + v + '"');
  });
  return out.join(", ");
}

// rgb()/rgba() -> short hex where we safely can, else leave as-is.
function fmtColor(v) {
  var m = v && v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (!m) return v;
  if (m[4] !== undefined && parseFloat(m[4]) < 1) return v; // keep alpha
  var hex = [m[1], m[2], m[3]]
    .map(function (n) {
      return ("0" + parseInt(n, 10).toString(16)).slice(-2);
    })
    .join("");
  if (hex[0] === hex[1] && hex[2] === hex[3] && hex[4] === hex[5])
    hex = hex[0] + hex[2] + hex[4];
  return "#" + hex;
}

// A handful of style props that matter for "make it bigger / change the color"
// asks. Skips defaults (black text, weight 400, transparent bg, no padding) so
// a plain element usually reduces to just its font-size.
export function curatedStyles(el) {
  if (!(el instanceof Element) || typeof getComputedStyle !== "function")
    return "";
  var s;
  try {
    s = getComputedStyle(el);
  } catch (e) {
    return "";
  }
  if (!s) return "";
  var parts = [];
  if (s.fontSize) parts.push("font-size " + s.fontSize);
  if (s.fontWeight && s.fontWeight !== "400" && s.fontWeight !== "normal")
    parts.push("weight " + s.fontWeight);
  var col = fmtColor(s.color);
  if (col && col !== "#000" && col !== "rgb(0, 0, 0)")
    parts.push("color " + col);
  if (
    s.backgroundColor &&
    s.backgroundColor !== "rgba(0, 0, 0, 0)" &&
    s.backgroundColor !== "transparent"
  )
    parts.push("bg " + fmtColor(s.backgroundColor));
  var p = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
  if (
    p.some(function (v) {
      return v && v !== "0px";
    })
  ) {
    var pad = p[0] === p[2] && p[1] === p[3] ? p[0] + " " + p[1] : p.join(" ");
    parts.push("padding " + pad);
  }
  return parts.join(" · ");
}

// Rendered size, for layout asks. "" when the element has no box (e.g. jsdom).
export function elementSize(el) {
  if (!(el instanceof Element)) return "";
  var w = el.offsetWidth || 0,
    h = el.offsetHeight || 0;
  if (!w && !h) return "";
  return Math.round(w) + "×" + Math.round(h) + "px";
}

// Source-file hints some bundlers/plugins leave on the DOM (Sentry's babel
// plugin is the common one and survives into production). Walks a few ancestors
// since the marker sits on the component root, not always the leaf.
export function sourceHint(el) {
  var cur = el,
    depth = 0;
  while (cur && cur.nodeType === 1 && depth < 4) {
    if (cur.hasAttribute && cur.hasAttribute("data-sentry-source-file")) {
      var file = cur.getAttribute("data-sentry-source-file");
      var comp = cur.getAttribute("data-sentry-component");
      return comp ? comp + " (" + file + ")" : file;
    }
    cur = cur.parentElement;
    depth++;
  }
  return "";
}

export function escapeHtml(s) {
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

export function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url || "";
  }
}

export function uniqueHosts(flags) {
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

export function uniqueUrlCount(flags) {
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

export function sessionTitle(s) {
  if (s.title) return s.title;
  var hosts = uniqueHosts(s.flags);
  if (!hosts.length) return "Empty session";
  return hosts[0] + (hosts.length > 1 ? " +" + (hosts.length - 1) : "");
}

export function relTime(ts) {
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

// Transient toast near the control. A truthy second arg flags it as an error.
export function flash(msg, isError) {
  var existing = document.getElementById("__cmt_flash");
  if (existing) existing.remove();
  var el = document.createElement("div");
  el.id = "__cmt_flash";
  if (isError) el.className = "__cmt_err";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function () {
    if (el.parentNode) el.remove();
  }, 1800);
}
