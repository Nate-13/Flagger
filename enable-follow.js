// Runs inside the in-page "Follow across pages" modal, which is this extension
// page embedded as an iframe. The Allow click is the user gesture that
// chrome.permissions.request requires (legal here because this is an extension
// page, not a content script).
const tabId = Number(new URLSearchParams(location.search).get("tab"));

function done() {
  // Tell the content script that hosts this iframe to close the modal.
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage("flagger:follow-done", "*");
    } else {
      window.close(); // standalone fallback
    }
  } catch (e) {}
}

document.getElementById("allow").addEventListener("click", () => {
  chrome.permissions.request({ origins: ["<all_urls>"] }, (granted) => {
    if (granted) {
      chrome.runtime.sendMessage({ type: "flagger:followGranted", tabId });
    }
    done();
  });
});

document.getElementById("cancel").addEventListener("click", done);
