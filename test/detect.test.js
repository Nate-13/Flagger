// Test the component probe end to end. In the extension the probe is injected
// into the page's main world by the background worker; here we eval dist/probe.js
// into the same jsdom window (single JS world) right after the overlay bundle,
// which still exercises the full postMessage round-trip (probe request → fiber
// walk → result → flag.component filled → re-persist). We fake a React fiber on
// the flagged element to stand in for a dev build.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const SRC = readFileSync(
  new URL("../dist/content.js", import.meta.url),
  "utf8",
);
const PROBE = readFileSync(
  new URL("../dist/probe.js", import.meta.url),
  "utf8",
);
const KEY = "__flagger_store_v1";
const clone = (v) =>
  v === undefined ? undefined : JSON.parse(JSON.stringify(v));

function inject() {
  const disk = {};
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
       <header><nav><a id="target">Sign up</a></nav></header>
     </body></html>`,
    { url: "https://example.com/a", runScripts: "dangerously" },
  );
  const w = dom.window;
  w.chrome = {
    storage: {
      local: {
        get(k, cb) {
          const o = {};
          if (disk[k] !== undefined) o[k] = clone(disk[k]);
          cb(o);
        },
        set(o, cb) {
          for (const k of Object.keys(o)) disk[k] = clone(o[k]);
          if (cb) cb();
        },
      },
    },
  };
  Object.defineProperty(w.navigator, "clipboard", {
    configurable: true,
    value: { writeText: () => Promise.resolve() },
  });
  w.confirm = () => true;
  w.alert = () => {};
  if (!w.CSS || !w.CSS.escape)
    w.CSS = { escape: (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&") };
  w.eval(SRC); // isolated-world overlay (registers the result listener)
  w.eval(PROBE); // main-world probe (background injects this in the extension)
  return { w, doc: w.document, disk };
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
  ta.value = note;
  ctx.doc
    .querySelector("#__cmt_popup .save")
    .dispatchEvent(new ctx.w.MouseEvent("click", { bubbles: true }));
}

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  pass++;
  console.log("  ok - " + msg);
}

console.log("[1] the probe resolves a React component + source file");
let ctx = inject();
assert(ctx.w.__flaggerProbe === 1, "main-world probe was injected");
// Fake a dev-build React fiber on the element (name is PascalCase; a host tag
// wrapper sits above it to exercise the walk up `fiber.return`).
const target = ctx.doc.getElementById("target");
target["__reactFiber$xyz"] = {
  type: "a", // host tag on the leaf — skipped
  _debugSource: null,
  return: {
    type: { name: "SignupButton" },
    _debugSource: { fileName: "src/nav/SignupButton.tsx", lineNumber: 14 },
    return: null,
  },
};
addFlag(ctx, "#target", "make this bigger");
await tick();
let flag = ctx.disk[KEY].sessions[0].flags[0];
assert(
  flag.component === "`<SignupButton>` — src/nav/SignupButton.tsx:14",
  "component name + source captured into the flag",
);
await tick(320); // let the one-shot marker cleanup timer fire
assert(
  !ctx.doc.getElementById("target").hasAttribute("data-flg-probe"),
  "the one-shot probe marker is cleaned off the element",
);

console.log("[2] a plain element leaves component empty");
ctx = inject();
addFlag(ctx, "#target", "fix the copy");
await tick();
flag = ctx.disk[KEY].sessions[0].flags[0];
assert(!flag.component, "no component field when there's no framework fiber");

console.log("\nALL " + pass + " ASSERTIONS PASSED");
