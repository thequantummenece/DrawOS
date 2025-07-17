function sendToContent(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message);
  });
}

const colorPicker = document.getElementById('colorPicker');

function updateColor(e) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'setColor', color: e.target.value });
  });
}

// Trigger on both drag and drop + confirm
colorPicker.addEventListener('input', updateColor);
colorPicker.addEventListener('change', updateColor);

document.getElementById('brushSize').addEventListener('input', (e) => {
  sendToContent({ type: 'setSize', size: parseInt(e.target.value) });
});

document.getElementById('eraserBtn').addEventListener('click', () => {
  sendToContent({ type: 'toggleEraser' });
});

document.getElementById('undoBtn').addEventListener('click', () => {
  sendToContent({ type: 'undo' });
});

document.getElementById('redoBtn').addEventListener('click', () => {
  sendToContent({ type: 'redo' });
});

document.getElementById('saveBtn').addEventListener('click', () => {
  sendToContent({ type: 'saveImage' });
});
