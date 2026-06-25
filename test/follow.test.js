// Content-side test for the navigate-and-reopen Follow modal (no toolbar
// button). Loads the built bundle into jsdom with a stubbed chrome.runtime.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const SRC = readFileSync(
  new URL("../dist/content.js", import.meta.url),
  "utf8",
);
const KEY = "__flagger_store_v1";
const EXT_ORIGIN = "chrome-extension://testid";
const tick = () => new Promise((r) => setTimeout(r, 5));

// An open session whose only flag lives on a DIFFERENT page, so the resume
// looks like a navigate-and-reopen (should offer Follow via the modal).
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
      getURL: (p) => EXT_ORIGIN + "/" + p,
      sendMessage(msg, cb) {
        sent.push(msg);
        if (msg.type === "flagger:getFollowState")
          cb && cb({ following: false, tabId: 99 });
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

console.log("[1] no persistent Follow button; modal offered after reopen");
let ctx = inject();
assert(
  !ctx.doc.getElementById("__cmt_follow"),
  "no Follow button in the toolbar",
);
await tick();
assert(
  ctx.sent.some((m) => m.type === "flagger:getFollowState"),
  "asks the background for follow state on mount",
);
let modal = ctx.doc.getElementById("__cmt_modal_backdrop");
assert(!!modal, "follow modal appears after navigate-and-reopen");
const frame = modal.querySelector("iframe");
assert(
  frame && /enable-follow\.html\?tab=99/.test(frame.getAttribute("src")),
  "modal hosts the enable-follow iframe targeting this tab",
);

console.log("[1b] iframe reports its height → frame is sized to fit");
ctx.w.dispatchEvent(
  new ctx.w.MessageEvent("message", {
    data: { source: "flagger-follow", type: "size", height: 222 },
    origin: EXT_ORIGIN,
  }),
);
assert(
  frame.style.height === "222px",
  "iframe height matches reported content height (no empty space)",
);

console.log("[2] iframe 'done' message closes the modal");
ctx.w.dispatchEvent(
  new ctx.w.MessageEvent("message", {
    data: { source: "flagger-follow", type: "done" },
    origin: EXT_ORIGIN,
  }),
);
assert(
  !ctx.doc.getElementById("__cmt_modal_backdrop"),
  "modal closes when the iframe signals done",
);

console.log("[3] a stray cross-origin message does NOT close the modal");
ctx = inject();
await tick();
assert(!!ctx.doc.getElementById("__cmt_modal_backdrop"), "modal is open");
ctx.w.dispatchEvent(
  new ctx.w.MessageEvent("message", {
    data: { source: "flagger-follow", type: "done" },
    origin: "https://evil.example.com",
  }),
);
assert(
  !!ctx.doc.getElementById("__cmt_modal_backdrop"),
  "modal stays open for non-extension origins",
);

console.log("[4] background confirming follow closes the modal");
ctx.getOnMsg()({ type: "flagger:followState", following: true });
assert(
  !ctx.doc.getElementById("__cmt_modal_backdrop"),
  "modal closes once following is confirmed",
);

console.log("\nALL " + pass + " ASSERTIONS PASSED");
