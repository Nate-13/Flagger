// Runs inside the in-page "Follow across pages" modal, which is this extension
// page embedded as an iframe. The Allow click is the user gesture that
// chrome.permissions.request requires (legal here because this is an extension
// page, not a content script).
const tabId = Number(new URLSearchParams(location.search).get("tab"));

function post(type, extra) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        Object.assign({ source: "flagger-follow", type }, extra || {}),
        "*",
      );
    } else if (type === "done") {
      window.close(); // standalone fallback
    }
  } catch (e) {}
}

// Tell the host to size the iframe to our actual content (no empty space).
function reportSize() {
  const h = Math.ceil(document.body.getBoundingClientRect().height);
  if (h > 0) post("size", { height: h });
}

document.getElementById("allow").addEventListener("click", () => {
  chrome.permissions.request({ origins: ["<all_urls>"] }, (granted) => {
    if (granted) {
      chrome.runtime.sendMessage({ type: "flagger:followGranted", tabId });
    }
    post("done");
  });
});

document.getElementById("cancel").addEventListener("click", () => post("done"));

reportSize();
requestAnimationFrame(reportSize);
window.addEventListener("resize", reportSize);
