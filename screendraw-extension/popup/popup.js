const sendMessage = (msg) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: msg });
  });
};

document.getElementById("toggle").onclick = () => sendMessage("TOGGLE_DRAW");
document.getElementById("eraser").onclick = () => sendMessage("TOGGLE_ERASER");
document.getElementById("undo").onclick = () => sendMessage("UNDO");
document.getElementById("redo").onclick = () => sendMessage("REDO");
