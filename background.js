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

function injectOverlay(tabId) {
  return chrome.scripting
    .executeScript({ target: { tabId }, files: ["content.js"] })
    .catch(() => {}); // ignore restricted pages / races
}

// Toolbar click: inject into the active tab (activeTab gesture).
chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.id != null) injectOverlay(tab.id);
});

// Re-inject after navigation in tabs where Follow is on.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;
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
  const tabId = sender && sender.tab ? sender.tab.id : null;

  if (msg.type === "flagger:getFollowState") {
    (async () => {
      const following =
        tabId != null &&
        (await isEngaged(tabId)) &&
        (await hasFollowPermission());
      sendResponse({ following });
    })();
    return true; // keep the channel open for the async response
  }

  if (msg.type === "flagger:requestFollow") {
    // Open a small page where the user can grant the permission with a click
    // (chrome.permissions.request needs a user gesture in a foreground page).
    if (tabId != null) {
      chrome.windows.create({
        url: chrome.runtime.getURL("enable-follow.html?tab=" + tabId),
        type: "popup",
        width: 440,
        height: 340,
      });
    }
    return;
  }

  if (msg.type === "flagger:followGranted") {
    (async () => {
      if (msg.tabId != null && (await hasFollowPermission())) {
        await engage(msg.tabId);
        try {
          chrome.tabs.sendMessage(msg.tabId, {
            type: "flagger:followState",
            following: true,
          });
        } catch (e) {}
      }
    })();
    return;
  }

  if (msg.type === "flagger:disengage") {
    if (tabId != null) disengage(tabId);
    return;
  }
});
