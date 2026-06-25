// Integration test for the Pause / Browse (pass-through) toggle. Loads the
// built bundle into jsdom and verifies click/hover interception flips with the
// toggle and the Alt+Shift+P shortcut. Run via `npm test`.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const SRC = readFileSync(
  new URL("../dist/content.js", import.meta.url),
  "utf8",
);

function makeChrome() {
  const disk = {};
  const clone = (v) =>
    v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  return {
    storage: {
      local: {
        get(key, cb) {
          const out = {};
          if (disk[key] !== undefined) out[key] = clone(disk[key]);
          cb(out);
        },
        set(obj, cb) {
          for (const k of Object.keys(obj)) disk[k] = clone(obj[k]);
          if (cb) cb();
        },
      },
    },
  };
}

const PAGE = `<!DOCTYPE html><html><body>
  <header><nav><a id="target" class="cta">Sign up</a></nav></header>
  <p id="other">hello</p>
</body></html>`;

function inject(url) {
  const dom = new JSDOM(PAGE, { url, runScripts: "dangerously" });
  const w = dom.window;
  w.chrome = makeChrome();
  Object.defineProperty(w.navigator, "clipboard", {
    configurable: true,
    value: { writeText: () => Promise.resolve() },
  });
  w.confirm = () => true;
  w.alert = () => {};
  if (!w.CSS || !w.CSS.escape) {
    w.CSS = { escape: (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&") };
  }
  w.eval(SRC);
  return { w, doc: w.document };
}

function clickEl(ctx, el) {
  // returns false if a handler called preventDefault (i.e. it was intercepted)
  return el.dispatchEvent(
    new ctx.w.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: 5,
      clientY: 6,
    }),
  );
}
function hover(ctx, el) {
  el.dispatchEvent(new ctx.w.MouseEvent("mouseover", { bubbles: true }));
}

let pass = 0;
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  pass++;
  console.log("  ok - " + msg);
}

const ctx = inject("https://example.com/a");
const { doc } = ctx;
const target = doc.querySelector("#target");
const other = doc.querySelector("#other");

console.log("[1] flagging mode intercepts");
hover(ctx, other);
assert(
  other.classList.contains("__cmt_outline"),
  "hover paints the crosshair outline",
);
const canceledWhileFlagging = clickEl(ctx, target) === false;
assert(canceledWhileFlagging, "click is intercepted (preventDefault)");
assert(!!doc.querySelector("#__cmt_popup"), "flag popup opened");

console.log("[2] pause via toolbar button → browsing");
doc
  .getElementById("__cmt_pause")
  .dispatchEvent(new ctx.w.MouseEvent("click", { bubbles: true }));
assert(
  doc.getElementById("__cmt_toolbar").classList.contains("__cmt_paused"),
  "toolbar shows the paused state",
);
const pauseBtn = doc.getElementById("__cmt_pause");
assert(/Resume/.test(pauseBtn.textContent), "button now says Resume");
assert(pauseBtn.classList.contains("primary"), "Resume button is highlighted");
assert(
  !doc.querySelector("#__cmt_popup"),
  "pausing closed the open flag popup",
);

console.log("[3] browsing mode passes through");
hover(ctx, target);
assert(
  !target.classList.contains("__cmt_outline"),
  "no crosshair outline while browsing",
);
let pageGotClick = false;
target.addEventListener("click", () => {
  pageGotClick = true;
});
const notCanceled = clickEl(ctx, target) === true;
assert(notCanceled, "click is NOT canceled (passes through to the page)");
assert(pageGotClick, "the page element received the native click");
assert(!doc.querySelector("#__cmt_popup"), "no flag popup while browsing");

console.log("[4] resume via Alt+Shift+P shortcut → flagging");
doc.dispatchEvent(
  new ctx.w.KeyboardEvent("keydown", {
    code: "KeyP",
    key: "P",
    altKey: true,
    shiftKey: true,
    bubbles: true,
  }),
);
assert(
  !doc.getElementById("__cmt_toolbar").classList.contains("__cmt_paused"),
  "shortcut resumed flagging (paused state cleared)",
);
assert(
  /Pause/.test(doc.getElementById("__cmt_pause").textContent),
  "button says Pause again",
);
const canceledAgain = clickEl(ctx, target) === false;
assert(canceledAgain, "clicks are intercepted again after resuming");

console.log("\nALL " + pass + " ASSERTIONS PASSED");
