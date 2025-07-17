// contents/content.js

// Inject draw.js as a script tag
const script = document.createElement('script');
script.src = chrome.runtime.getURL('content/draw.js');
script.onload = function () {
  this.remove(); // Clean up after injection
};
(document.head || document.documentElement).appendChild(script);
