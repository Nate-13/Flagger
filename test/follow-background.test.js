// Unit test for the background worker's "follow across pages" logic. Loads
// background.js with a fake chrome and drives the message + navigation flow.
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../background.js", import.meta.url), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 5));

function makeChrome() {
  const listeners = {};
  const reg = (path) => ({
    addListener: (fn) => {
      listeners[path] = fn;
    },
  });
  const session = {};
  let perm = false;
  const calls = { exec: [], windows: [], tabMsgs: [] };
  return {
    _listeners: listeners,
    _calls: calls,
    _setPerm: (v) => {
      perm = v;
    },
    action: { onClicked: reg("onClicked") },
    tabs: {
      onUpdated: reg("onUpdated"),
      onRemoved: reg("onRemoved"),
      sendMessage: (tabId, msg) => calls.tabMsgs.push({ tabId, msg }),
    },
    runtime: {
      onMessage: reg("onMessage"),
      getURL: (p) => "chrome-extension://x/" + p,
      lastError: null,
    },
    scripting: {
      executeScript: (opts) => {
        calls.exec.push(opts);
        return Promise.resolve();
      },
    },
    windows: {
      create: (opts) => {
        calls.windows.push(opts);
        return Promise.resolve();
      },
    },
    permissions: {
      contains: () => Promise.resolve(perm),
      onRemoved: reg("permRemoved"),
    },
    storage: {
      session: {
        get: (key) =>
          Promise.resolve(
            session[key] !== undefined ? { [key]: session[key] } : {},
          ),
        set: (obj) => {
          Object.assign(session, obj);
          return Promise.resolve();
        },
      },
    },
  };
}

let pass = 0;
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  pass++;
  console.log("  ok - " + msg);
}

const chrome = makeChrome();
new Function("chrome", SRC)(chrome);
const L = chrome._listeners;
const C = chrome._calls;

console.log("[1] toolbar click injects");
L.onClicked({ id: 7 });
assert(
  C.exec.some((c) => c.target.tabId === 7 && c.files.includes("content.js")),
  "onClicked injects content.js",
);

console.log("[2] no re-inject when tab is not following");
C.exec.length = 0;
await L.onUpdated(7, { status: "complete" });
assert(C.exec.length === 0, "navigation does not re-inject an unengaged tab");

console.log("[3] requestFollow opens the grant window");
L.onMessage({ type: "flagger:requestFollow" }, { tab: { id: 7 } }, () => {});
await tick();
assert(
  C.windows.length === 1 && /enable-follow\.html\?tab=7/.test(C.windows[0].url),
  "opens enable-follow.html for the right tab",
);

console.log("[4] granting permission engages + notifies the tab");
chrome._setPerm(true);
L.onMessage({ type: "flagger:followGranted", tabId: 7 }, {}, () => {});
await tick();
assert(
  C.tabMsgs.some((m) => m.tabId === 7 && m.msg.following === true),
  "tab is told it is now following",
);

console.log("[5] re-inject after navigation when following");
C.exec.length = 0;
await L.onUpdated(7, { status: "complete" });
await tick();
assert(
  C.exec.some((c) => c.target.tabId === 7),
  "navigation re-injects the overlay while following",
);

console.log("[6] only on completed navigations");
C.exec.length = 0;
await L.onUpdated(7, { status: "loading" });
assert(C.exec.length === 0, "ignores non-complete navigation updates");

console.log("[7] getFollowState reflects engagement");
let state;
L.onMessage({ type: "flagger:getFollowState" }, { tab: { id: 7 } }, (r) => {
  state = r;
});
await tick();
assert(
  state && state.following === true,
  "getFollowState true when engaged + permitted",
);

console.log("[8] disengage stops following");
L.onMessage({ type: "flagger:disengage" }, { tab: { id: 7 } }, () => {});
await tick();
C.exec.length = 0;
await L.onUpdated(7, { status: "complete" });
await tick();
assert(C.exec.length === 0, "navigation no longer re-injects after disengage");

console.log("\nALL " + pass + " ASSERTIONS PASSED");
