// Integration test for Figma-style on-page comments: a numbered pin expands in
// place into its note, which can be read, edited, and deleted without opening
// the island. Loads the built bundle into jsdom with a fake chrome.storage.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const SRC = readFileSync(
  new URL("../dist/content.js", import.meta.url),
  "utf8",
);
const KEY = "__flagger_store_v1";
const HERE = "https://example.com/here";
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const clone = (v) =>
  v === undefined ? undefined : JSON.parse(JSON.stringify(v));

// An open session with one flag pinned to an element on THIS page.
function seededDisk() {
  return {
    [KEY]: {
      openId: "s1",
      sessions: [
        {
          id: "s1",
          status: "open",
          copied: false,
          flags: [
            {
              id: 1,
              url: HERE,
              selector: "#here",
              summary: "<p>hi</p>",
              x: 1,
              y: 1,
              text: "fix the copy",
            },
          ],
        },
      ],
    },
  };
}

function inject() {
  const disk = seededDisk();
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body><p id="here">hi</p><p id="elsewhere">x</p></body></html>`,
    { url: HERE, runScripts: "dangerously" },
  );
  const w = dom.window;
  w.chrome = {
    storage: {
      local: {
        get(key, cb) {
          const o = {};
          if (disk[key] !== undefined) o[key] = clone(disk[key]);
          cb(o);
        },
        set(obj, cb) {
          for (const k of Object.keys(obj)) disk[k] = clone(obj[k]);
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
  w.Element.prototype.scrollIntoView = function () {};
  w.eval(SRC);
  return { w, doc: w.document, disk };
}

const click = (w, el) =>
  el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));

let pass = 0;
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  pass++;
  console.log("  ok - " + msg);
}

console.log("[1] the flag pins a numbered tag on the page");
let ctx = inject();
await tick();
let badge = ctx.doc.querySelector(".__cmt_badge");
assert(!!badge, "a pin is rendered for the on-page flag");
assert(
  badge.querySelector(".__cmt_pinnum").textContent === "1",
  "the pin shows its number",
);
assert(
  !ctx.doc.querySelector(".__cmt_comment .ctext"),
  "the comment is not rendered until opened",
);

console.log("[2] clicking the pin expands the comment in place");
click(ctx.w, badge);
assert(badge.classList.contains("open"), "the pin opens");
assert(
  ctx.doc.querySelector(".__cmt_comment .ctext").textContent === "fix the copy",
  "the note text is shown without opening the island",
);

console.log("[3] editing the comment in place persists");
click(ctx.w, badge.querySelector(".cedit"));
const ta = badge.querySelector(".__cmt_comment textarea");
assert(
  !!ta && ta.value === "fix the copy",
  "edit shows a textarea with the note",
);
ta.value = "make it bold";
click(ctx.w, badge.querySelector(".csave"));
assert(
  badge.querySelector(".__cmt_comment .ctext").textContent === "make it bold",
  "the bubble shows the edited note",
);
assert(
  ctx.disk[KEY].sessions[0].flags[0].text === "make it bold",
  "the edit is persisted to storage",
);

console.log("[4] clicking the page closes the comment (no new flag)");
click(ctx.w, ctx.doc.getElementById("elsewhere"));
assert(!badge.classList.contains("open"), "clicking away closes the bubble");
assert(!ctx.doc.querySelector("#__cmt_popup"), "no new flag popup was opened");

console.log("[5] deleting from the bubble removes the flag + its pin");
click(ctx.w, badge); // reopen
click(ctx.w, badge.querySelector(".cdel"));
assert(
  ctx.doc.querySelectorAll(".__cmt_badge").length === 0,
  "the pin is removed",
);
assert(
  ctx.disk[KEY].sessions[0].flags.length === 0,
  "the flag is removed from storage",
);

console.log("\nALL " + pass + " ASSERTIONS PASSED");
