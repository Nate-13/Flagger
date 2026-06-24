// Small DOM-agnostic helpers used across the overlay.
import { BLACK } from "./theme.js";

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

// Transient toast in the top-right. `color` (optional) tints it for errors.
export function flash(msg, color) {
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
