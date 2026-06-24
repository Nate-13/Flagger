// MV3 service worker: inject the Flagger overlay into the active tab when the
// toolbar icon is clicked. `activeTab` grants temporary host access to that tab
// at click time, so no broad host permissions are needed.
chrome.action.onClicked.addListener(function (tab) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["bookmarklet.js"],
  });
});
