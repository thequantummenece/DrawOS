document.getElementById("drawBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "startDrawing" });
});