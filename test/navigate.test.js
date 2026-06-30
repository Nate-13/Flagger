// Test "click a flag on another page → go there, then highlight it on arrival".
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const SRC = readFileSync(
  new URL("../dist/content.js", import.meta.url),
  "utf8",
);
const STORE = "__flagger_store_v1";
const LOCATE = "__flagger_locate";
const HERE = "https://example.com/here";
const OTHER = "https://example.com/other";
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const clone = (v) =>
  v === undefined ? undefined : JSON.parse(JSON.stringify(v));

function flag(id, url) {
  return {
    id,
    url,
    selector: "#target",
    summary: "<a>x</a>",
    x: 1,
    y: 1,
    text: "note " + id,
  };
}

function inject(url, disk) {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body><a id="target">x</a></body></html>`,
    {
      url,
      runScripts: "dangerously",
    },
  );
  const w = dom.window;
  const navigations = [];
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
        remove(key, cb) {
          delete disk[key];
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
  try {
    Object.defineProperty(w.location, "assign", {
      configurable: true,
      value: (u) => navigations.push(u),
    });
  } catch (e) {
    /* jsdom location is finicky; the test still asserts the stored intent */
  }
  w.eval(SRC);
  return { w, doc: w.document, navigations, disk };
}

let pass = 0;
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  pass++;
  console.log("  ok - " + msg);
}

console.log("[1] clicking a cross-page flag navigates + stashes the target");
{
  const disk = {
    [STORE]: {
      openId: "s1",
      sessions: [
        { id: "s1", status: "open", copied: false, flags: [flag(1, OTHER)] },
      ],
    },
  };
  const ctx = inject(HERE, disk);
  await tick();
  // the island keeps the flag list rendered; the cross-page flag is a card
  const card = ctx.doc.querySelector("#__cmt_panel_list .__cmt_card");
  assert(!!card, "cross-page flag shows in the list");
  card.dispatchEvent(new ctx.w.MouseEvent("click", { bubbles: true }));
  // The stash is written right before location.assign(), so it proves the
  // navigate path ran. (jsdom won't let us observe the navigation itself.)
  assert(
    disk[LOCATE] && disk[LOCATE].url === OTHER && disk[LOCATE].id === 1,
    "clicking a cross-page flag stashes the target + navigates",
  );
}

console.log("[2] arriving on the page highlights the flag + clears the stash");
{
  const disk = {
    [STORE]: {
      openId: "s1",
      sessions: [
        { id: "s1", status: "open", copied: false, flags: [flag(1, HERE)] },
      ],
    },
    [LOCATE]: { url: HERE, id: 1, ts: Date.now() },
  };
  const ctx = inject(HERE, disk);
  await tick(220); // wait past resolvePendingLocate's 150ms settle delay
  assert(
    ctx.doc.getElementById("target").classList.contains("__cmt_flash_anim"),
    "the flag's element is highlighted on arrival",
  );
  assert(disk[LOCATE] === undefined, "the locate stash is consumed");
}

console.log("[3] a stale stash is dropped, not acted on");
{
  const disk = {
    [STORE]: {
      openId: "s1",
      sessions: [
        { id: "s1", status: "open", copied: false, flags: [flag(1, HERE)] },
      ],
    },
    [LOCATE]: { url: HERE, id: 1, ts: Date.now() - 60000 }, // 60s old
  };
  const ctx = inject(HERE, disk);
  await tick(220);
  assert(
    !ctx.doc.getElementById("target").classList.contains("__cmt_flash_anim"),
    "stale stash does not highlight",
  );
  assert(disk[LOCATE] === undefined, "stale stash is cleared");
}

console.log("\nALL " + pass + " ASSERTIONS PASSED");
