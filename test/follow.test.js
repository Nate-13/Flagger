// Content-side test for the Follow toggle + the navigate-and-reopen nudge.
// Loads the built bundle into jsdom with a stubbed chrome.runtime.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const SRC = readFileSync(
  new URL("../dist/content.js", import.meta.url),
  "utf8",
);
const KEY = "__flagger_store_v1";
const tick = () => new Promise((r) => setTimeout(r, 5));

// A store with an open session whose flag lives on a DIFFERENT page, so the
// resume looks like a navigate-and-reopen (should trigger the Follow nudge).
function seededDisk() {
  return {
    [KEY]: {
      openId: "s1",
      sessions: [
        {
          id: "s1",
          title: null,
          createdAt: 1,
          updatedAt: 2,
          status: "open",
          copied: false,
          flags: [
            {
              id: 1,
              url: "https://example.com/other",
              selector: "#nope",
              summary: "<a>x</a>",
              x: 1,
              y: 1,
              text: "t",
            },
          ],
        },
      ],
    },
  };
}

const PAGE = `<!DOCTYPE html><html><body><p id="here">hi</p></body></html>`;

function inject() {
  const disk = seededDisk();
  const clone = (v) =>
    v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  const sent = [];
  let onMsg = null;
  const dom = new JSDOM(PAGE, {
    url: "https://example.com/here",
    runScripts: "dangerously",
  });
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
    runtime: {
      id: "testid",
      lastError: null,
      sendMessage(msg, cb) {
        sent.push(msg);
        if (msg.type === "flagger:getFollowState")
          cb && cb({ following: false });
        else cb && cb({});
      },
      onMessage: {
        addListener(fn) {
          onMsg = fn;
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
  return { w, doc: w.document, sent, getOnMsg: () => onMsg };
}

let pass = 0;
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  pass++;
  console.log("  ok - " + msg);
}

const ctx = inject();
const { doc } = ctx;

console.log("[1] follow button + initial state");
const btn = doc.getElementById("__cmt_follow");
assert(!!btn, "Follow button is in the toolbar");
await tick();
assert(
  ctx.sent.some((m) => m.type === "flagger:getFollowState"),
  "asks the background for the current follow state on mount",
);
assert(!btn.classList.contains("__cmt_on"), "starts not-following");

console.log("[2] navigate-and-reopen nudge");
const flash = doc.getElementById("__cmt_flash");
assert(
  !!flash && /Follow/.test(flash.textContent),
  "nudge shown (session spans pages + not following)",
);

console.log("[3] clicking Follow asks the background to start it");
btn.dispatchEvent(new ctx.w.MouseEvent("click", { bubbles: true }));
assert(
  ctx.sent.some((m) => m.type === "flagger:requestFollow"),
  "click sends requestFollow",
);

console.log("[4] background confirms → button lights up");
ctx.getOnMsg()({ type: "flagger:followState", following: true });
assert(btn.classList.contains("__cmt_on"), "button shows the following state");
assert(/Following/.test(btn.textContent), "button label is Following");

console.log("\nALL " + pass + " ASSERTIONS PASSED");
