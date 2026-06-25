// "Follow across pages" — talks to the background worker, which re-injects the
// overlay after navigations once the optional host permission is granted.
import { STATE } from "./state.js";
import { ICON } from "./icons.js";
import { flash } from "./utils.js";

function runtime() {
  try {
    return window.chrome && chrome.runtime && chrome.runtime.id
      ? chrome.runtime
      : null;
  } catch (e) {
    return null;
  }
}

function send(msg) {
  return new Promise((resolve) => {
    var rt = runtime();
    if (!rt || !rt.sendMessage) {
      resolve(null);
      return;
    }
    try {
      rt.sendMessage(msg, function (resp) {
        void chrome.runtime.lastError; // swallow "no receiver" noise
        resolve(resp || null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

// Wire up the Follow button and learn the current state from the background.
export function initFollow() {
  var rt = runtime();
  if (rt && rt.onMessage) {
    rt.onMessage.addListener(function (msg) {
      if (msg && msg.type === "flagger:followState")
        setFollowing(!!msg.following);
    });
  }
  send({ type: "flagger:getFollowState" }).then(function (resp) {
    STATE._followKnown = true;
    setFollowing(!!(resp && resp.following));
    evaluateNudge();
  });
}

export function toggleFollow() {
  if (STATE.following) {
    send({ type: "flagger:disengage" });
    setFollowing(false);
    flash("Stopped following");
  } else {
    send({ type: "flagger:requestFollow" });
    flash("Approve access to follow across pages");
  }
}

function setFollowing(on) {
  STATE.following = on;
  var btn = document.getElementById("__cmt_follow");
  if (!btn) return;
  if (on) {
    btn.classList.add("__cmt_on");
    btn.innerHTML = ICON.link + " Following";
    btn.title = "Flagger follows you across pages — click to stop";
  } else {
    btn.classList.remove("__cmt_on");
    btn.innerHTML = ICON.link + " Follow";
    btn.title = "Follow across pages (asks for permission once)";
  }
}

// Called by sessions on resume so the nudge knows whether you've navigated.
export function noteResume(spansPages) {
  STATE._resumedSpansPages = spansPages;
  STATE._resumeDone = true;
  evaluateNudge();
}

// Show the "turn on Follow" hint once — only after a navigate-and-reopen
// (the session already spans pages) and only when Follow is off.
function evaluateNudge() {
  if (STATE._nudged) return;
  if (!STATE._followKnown || !STATE._resumeDone) return; // wait for both
  if (STATE.following || !STATE._resumedSpansPages) return;
  STATE._nudged = true;
  flash("Tip: turn on Follow to keep Flagger with you across pages");
}
