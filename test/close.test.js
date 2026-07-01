// Test the Esc-to-close affordance: the first Esc arms a ✕ on the pill; a second
// Esc (or clicking the ✕) closes the overlay. Loads the built bundle into jsdom.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const SRC = readFileSync(
  new URL("../dist/content.js", import.meta.url),
  "utf8",
);
const clone = (v) =>
  v === undefined ? undefined : JSON.parse(JSON.stringify(v));

function inject() {
  const disk = {};
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body><p id="x">hi</p></body></html>`,
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
  if (!w.CSS) w.CSS = { escape: (s) => String(s) };
  w.eval(SRC);
  return { w, doc: w.document };
}

const esc = (w) =>
  w.document.dispatchEvent(
    new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
const click = (w, el) =>
  el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));

let pass = 0;
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  pass++;
  console.log("  ok - " + msg);
}

console.log("[1] first Esc arms the close affordance");
let ctx = inject();
let isl = ctx.doc.getElementById("__cmt_island");
assert(!!isl, "overlay mounted");
assert(!isl.classList.contains("__cmt_armed"), "not armed at rest");
esc(ctx.w);
assert(isl.classList.contains("__cmt_armed"), "first Esc arms it");
assert(
  !!ctx.doc.getElementById("__cmt_quickclose"),
  "a ✕ close button is present on the pill",
);

console.log("[2] a second Esc closes the overlay");
esc(ctx.w);
assert(
  !ctx.doc.getElementById("__cmt_island"),
  "second Esc removes the overlay",
);
assert(!ctx.w.__flaggerActive, "the double-activation guard is cleared");

console.log("[3] clicking the ✕ closes the overlay");
ctx = inject();
esc(ctx.w); // arm
click(ctx.w, ctx.doc.getElementById("__cmt_quickclose"));
assert(
  !ctx.doc.getElementById("__cmt_island"),
  "clicking the ✕ removes the overlay",
);

console.log("\nALL " + pass + " ASSERTIONS PASSED");
