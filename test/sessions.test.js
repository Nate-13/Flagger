// Integration test for the session/history state machine. Loads the BUILT
// bundle (dist/content.js) into jsdom with a fake chrome.storage and drives the
// overlay through real DOM events. Run via `npm test` (which builds first).
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const SRC = readFileSync(
  new URL("../dist/content.js", import.meta.url),
  "utf8",
);

// Shared fake chrome.storage.local that persists across "injections".
const disk = {};
const clone = (v) =>
  v === undefined ? undefined : JSON.parse(JSON.stringify(v));
function makeChrome() {
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
  const clipboardWrites = [];
  Object.defineProperty(w.navigator, "clipboard", {
    configurable: true,
    value: { writeText: (t) => (clipboardWrites.push(t), Promise.resolve()) },
  });
  w.confirm = () => true;
  w.alert = () => {};
  if (!w.CSS || !w.CSS.escape) {
    w.CSS = { escape: (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&") };
  }
  w.eval(SRC); // initSessions runs synchronously (fake get is sync)
  return { dom, w, doc: w.document, clipboardWrites };
}

function addFlag(ctx, selector, note) {
  ctx.doc.querySelector(selector).dispatchEvent(
    new ctx.w.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 50,
    }),
  );
  const ta = ctx.doc.querySelector("#__cmt_popup textarea");
  if (!ta) throw new Error("popup textarea did not appear");
  ta.value = note;
  ctx.doc
    .querySelector("#__cmt_popup .save")
    .dispatchEvent(new ctx.w.MouseEvent("click", { bubbles: true }));
}

function click(ctx, selector) {
  const el = ctx.doc.querySelector(selector);
  if (!el) throw new Error("missing element: " + selector);
  el.dispatchEvent(new ctx.w.MouseEvent("click", { bubbles: true }));
  return el;
}

const KEY = "__flagger_store_v1";
let pass = 0;
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  pass++;
  console.log("  ok - " + msg);
}

const URL1 = "https://example.com/a";
const URL2 = "https://example.com/b";
let ctx, store, row;

console.log("[1] auto-save on flag");
ctx = inject(URL1);
addFlag(ctx, "#target", "make this bigger");
store = disk[KEY];
assert(store && store.sessions.length === 1, "one session created");
assert(
  store.sessions[0].status === "open" && store.openId === store.sessions[0].id,
  "session is open + tracked",
);
assert(store.sessions[0].flags.length === 1, "session has 1 flag");
assert(store.sessions[0].flags[0].selector === "#target", "selector captured");
assert(store.sessions[0].flags[0].text === "make this bigger", "note captured");
assert(store.sessions[0].flags[0].url === URL1, "url captured");
assert(ctx.doc.querySelectorAll(".__cmt_badge").length === 1, "badge pinned");

console.log("[2] multi-page accumulation + resume");
ctx = inject(URL2);
assert(
  ctx.doc.querySelectorAll(".__cmt_badge").length === 0,
  "no badge pinned on a different page",
);
assert(
  ctx.doc.querySelector("#__cmt_count_label").textContent === "1",
  "resumed session shows count 1 across pages",
);
addFlag(ctx, "#other", "remove this");
store = disk[KEY];
assert(store.sessions.length === 1, "still one session (resumed, not new)");
assert(store.sessions[0].flags.length === 2, "second page flag appended");
assert(
  new Set(store.sessions[0].flags.map((f) => f.url)).size === 2,
  "session spans two pages",
);

console.log("[3] copy ends the session");
click(ctx, "#__cmt_copy");
await new Promise((r) => setTimeout(r, 20));
store = disk[KEY];
assert(store.openId === null, "openId cleared after copy");
assert(
  store.sessions[0].status === "done" && store.sessions[0].copied === true,
  "session marked done+copied",
);
assert(ctx.clipboardWrites.length === 1, "markdown copied to clipboard");
assert(
  /## Flag 1[\s\S]*## Flag 2/.test(ctx.clipboardWrites[0]),
  "markdown has both flags",
);

console.log("[4] fresh session after copy");
ctx = inject(URL1);
assert(
  ctx.doc.querySelector("#__cmt_count_label").textContent === "0",
  "fresh session, count 0",
);
assert(
  ctx.doc.querySelectorAll(".__cmt_badge").length === 0,
  "no badges on fresh session",
);

console.log("[5] history quick-copy + reopen");
click(ctx, "#__cmt_history");
row = ctx.doc.querySelector("#__cmt_panel_list .__cmt_srow");
assert(!!row, "the saved session appears in history");
row
  .querySelector(".scopy")
  .dispatchEvent(new ctx.w.MouseEvent("click", { bubbles: true }));
assert(
  ctx.clipboardWrites.length === 1 && /## Flag 1/.test(ctx.clipboardWrites[0]),
  "quick-copy wrote session markdown",
);
assert(disk[KEY].openId === null, "quick-copy did NOT reopen the session");
row.dispatchEvent(new ctx.w.MouseEvent("click", { bubbles: true }));
store = disk[KEY];
assert(store.openId === store.sessions[0].id, "row click reopened the session");
assert(store.sessions[0].status === "open", "reopened session is open again");
assert(
  ctx.doc.querySelector("#__cmt_count_label").textContent === "2",
  "reopened: count restored to 2",
);
assert(
  ctx.doc.querySelectorAll(".__cmt_badge").length === 1,
  "reopened: 1 flag re-pinned on this page (URL1)",
);

console.log("[6] new session");
click(ctx, "#__cmt_history");
click(ctx, "#__cmt_hist_new");
store = disk[KEY];
assert(store.openId === null, "new session cleared openId");
assert(store.sessions.length === 1, "parked session retained (had flags)");
assert(store.sessions[0].status === "done", "parked session marked done");
assert(
  ctx.doc.querySelector("#__cmt_count_label").textContent === "0",
  "new session count 0",
);
assert(
  ctx.doc.querySelectorAll(".__cmt_badge").length === 0,
  "new session has no badges",
);

console.log("\nALL " + pass + " ASSERTIONS PASSED");
