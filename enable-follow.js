// Runs in the small "Follow across pages" window the background opens. The
// Allow click is the user gesture chrome.permissions.request needs.
const tabId = Number(new URLSearchParams(location.search).get("tab"));

document.getElementById("allow").addEventListener("click", () => {
  chrome.permissions.request({ origins: ["<all_urls>"] }, (granted) => {
    if (granted) {
      chrome.runtime.sendMessage({ type: "flagger:followGranted", tabId });
    }
    window.close();
  });
});

document.getElementById("cancel").addEventListener("click", () => {
  window.close();
});
