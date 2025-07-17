chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startDrawing") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["contents/content.js"]
      });
    });
  }
});