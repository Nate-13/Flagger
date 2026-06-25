// MV3 service worker.
//
// - Toolbar click injects the Flagger overlay into the active tab (covered by
//   the `activeTab` grant from the click — no broad permissions needed).
// - When a tab has "Follow across pages" enabled, the overlay is re-injected
//   after each navigation so it survives page changes. Following requires the
//   optional <all_urls> host permission, which the user grants from the
//   enable-follow page (activeTab is revoked the moment a tab navigates, so a
//   standing host permission is the only way to re-inject without a new click).
//
// Engaged tabs are tracked in chrome.storage.session so the set survives
// service-worker restarts but clears when the browser closes.

const ENGAGED_KEY = "flaggerEngagedTabs";
const ALL_URLS = { origins: ["<all_urls>"] };

async function getEngaged() {
  try {
    const r = await chrome.storage.session.get(ENGAGED_KEY);
    return new Set(r[ENGAGED_KEY] || []);
  } catch (e) {
    return new Set();
  }
}
async function setEngaged(set) {
  try {
    await chrome.storage.session.set({ [ENGAGED_KEY]: Array.from(set) });
  } catch (e) {}
}
async function engage(tabId) {
  const s = await getEngaged();
  s.add(tabId);
  await setEngaged(s);
}
async function disengage(tabId) {
  const s = await getEngaged();
  if (s.delete(tabId)) await setEngaged(s);
}
async function isEngaged(tabId) {
  return (await getEngaged()).has(tabId);
}
async function hasFollowPermission() {
  try {
    return await chrome.permissions.contains(ALL_URLS);
  } catch (e) {
    return false;
  }
}

// Only http(s) pages are injectable. chrome://, the Web Store, view-source:,
// the New Tab page, etc. are off-limits and executeScript errors on them.
function isInjectableUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

// Never rejects: swallows both synchronous throws (e.g. "Cannot access a
// chrome:// URL") and async rejections (tab closed mid-flight, races).
async function injectOverlay(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  } catch (e) {
    /* restricted page / closed tab / race — ignore */
  }
}

// Toolbar click: inject into the active tab (activeTab gesture). Skip pages we
// know we can't touch; otherwise attempt (injectOverlay swallows failures).
chrome.action.onClicked.addListener((tab) => {
  if (!tab || tab.id == null) return;
  if (tab.url && !isInjectableUrl(tab.url)) return;
  injectOverlay(tab.id);
});

// Re-inject after navigation in tabs where Follow is on.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!isInjectableUrl(tab && tab.url)) return;
  if (!(await isEngaged(tabId))) return;
  if (!(await hasFollowPermission())) return;
  injectOverlay(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  disengage(tabId);
});

// If the user revokes host access, stop following everywhere.
if (chrome.permissions && chrome.permissions.onRemoved) {
  chrome.permissions.onRemoved.addListener((perms) => {
    if (perms && perms.origins && perms.origins.includes("<all_urls>")) {
      setEngaged(new Set());
    }
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  const senderTabId = sender && sender.tab ? sender.tab.id : null;

  if (msg.type === "flagger:getFollowState") {
    (async () => {
      const following =
        senderTabId != null &&
        (await isEngaged(senderTabId)) &&
        (await hasFollowPermission());
      // Return the tab id so the content script can target the enable-follow
      // iframe at the right tab.
      sendResponse({ following, tabId: senderTabId });
    })();
    return true; // keep the channel open for the async response
  }

  if (msg.type === "flagger:followGranted") {
    // Sent from the enable-follow iframe after the user grants permission.
    const tabId = msg.tabId != null ? msg.tabId : senderTabId;
    (async () => {
      if (tabId != null && (await hasFollowPermission())) {
        await engage(tabId);
        try {
          chrome.tabs.sendMessage(tabId, {
            type: "flagger:followState",
            following: true,
          });
        } catch (e) {}
      }
    })();
    return;
  }

  if (msg.type === "flagger:disengage") {
    if (senderTabId != null) disengage(senderTabId);
    return;
  }
});
