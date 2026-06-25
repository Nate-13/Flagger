// "Follow across pages". The overlay normally dies on navigation; when Follow
// is on, the background worker re-injects it after each navigation.
//
// There is no toolbar button. Following is offered through an in-page modal —
// an iframe of the extension's enable-follow page — shown once per session
// after a navigate-and-reopen. The iframe (an extension page) is where the
// permission is actually requested, since content scripts can't do that.
import { STATE } from "./state.js";
import { flash } from "./utils.js";
import { markFollowPrompted } from "./sessions.js";

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

export function initFollow() {
  var rt = runtime();
  if (rt && rt.onMessage) {
    rt.onMessage.addListener(function (msg) {
      if (msg && msg.type === "flagger:followState")
        setFollowing(!!msg.following);
    });
  }
  window.addEventListener("message", onModalMessage, false);

  send({ type: "flagger:getFollowState" }).then(function (resp) {
    STATE._followKnown = true;
    STATE.following = !!(resp && resp.following);
    if (resp && resp.tabId != null) STATE._tabId = resp.tabId;
    maybeOfferFollow();
  });
}

export function teardownFollow() {
  window.removeEventListener("message", onModalMessage, false);
  closeFollowModal();
  send({ type: "flagger:disengage" }); // closing the overlay stops following
}

function setFollowing(on) {
  var was = STATE.following;
  STATE.following = on;
  if (on) {
    closeFollowModal();
    if (!was) flash("Following — Flagger will stay with you across pages");
  }
}

// Called by sessions on resume so the offer knows whether you've navigated and
// whether this session was already offered Follow.
export function noteResume(spansPages, alreadyPrompted) {
  STATE._resumedSpansPages = spansPages;
  STATE._followPromptedAlready = !!alreadyPrompted;
  STATE._resumeDone = true;
  maybeOfferFollow();
}

// Offer Follow once per session — only after a navigate-and-reopen (the resumed
// session already spans pages) and only when Follow is off.
function maybeOfferFollow() {
  if (STATE._offered) return;
  if (!STATE._followKnown || !STATE._resumeDone) return; // wait for both
  if (STATE.following || !STATE._resumedSpansPages) return;
  if (STATE._followPromptedAlready) return;
  if (STATE._tabId == null) return; // need runtime + tab id to build the iframe
  STATE._offered = true;
  showFollowModal();
  markFollowPrompted();
}

function showFollowModal() {
  var rt = runtime();
  if (!rt || STATE.modal) return;
  var backdrop = document.createElement("div");
  backdrop.id = "__cmt_modal_backdrop";
  var frame = document.createElement("iframe");
  frame.id = "__cmt_modal_frame";
  frame.src = rt.getURL("enable-follow.html?tab=" + STATE._tabId);
  backdrop.appendChild(frame);
  backdrop.addEventListener("mousedown", function (e) {
    if (e.target === backdrop) closeFollowModal(); // click outside the card
  });
  document.body.appendChild(backdrop);
  STATE.modal = backdrop;
}

export function closeFollowModal() {
  if (STATE.modal) {
    STATE.modal.remove();
    STATE.modal = null;
  }
}

function onModalMessage(e) {
  if (!e || typeof e.origin !== "string") return;
  if (e.origin.indexOf("chrome-extension://") !== 0) return;
  if (e.data === "flagger:follow-done") closeFollowModal();
}
