let currentActiveToolButton = null; // To track which tool button is active

function sendToContent(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
}

function setActiveToolButton(buttonId) {
  if (currentActiveToolButton) {
    currentActiveToolButton.classList.remove('active');
  }
  const newActiveButton = document.getElementById(buttonId);
  if (newActiveButton) {
    newActiveButton.classList.add('active');
    currentActiveToolButton = newActiveButton;
  }
}

// Initial state and event listeners for controls
document.addEventListener('DOMContentLoaded', () => {
  const colorPicker = document.getElementById('colorPicker'); //
  const brushSizeSlider = document.getElementById('brushSize'); //
  const eraserBtn = document.getElementById('eraserBtn'); //
  const brushBtn = document.getElementById('brushBtn');
  const undoBtn = document.getElementById('undoBtn'); //
  const redoBtn = document.getElementById('redoBtn'); //
  const saveBtn = document.getElementById('saveBtn'); //
  const clearAllBtn = document.getElementById('clearAllBtn');
  const toggleDrawingBtn = document.getElementById('toggleDrawingBtn');

  // --- Event Listeners ---

  colorPicker.addEventListener('input', (e) => { //
    sendToContent({ type: 'setColor', color: e.target.value }); //
    setActiveToolButton('brushBtn'); // Set brush button active when color is chosen
  });
  colorPicker.addEventListener('change', (e) => { //
    sendToContent({ type: 'setColor', color: e.target.value }); //
    setActiveToolButton('brushBtn');
  });

  brushSizeSlider.addEventListener('input', (e) => { //
    sendToContent({ type: 'setSize', size: parseInt(e.target.value) }); //
  });

  brushBtn.addEventListener('click', () => {
    sendToContent({ type: 'setColor', color: colorPicker.value }); // Re-send current color to ensure brush mode
    setActiveToolButton('brushBtn');
  });

  eraserBtn.addEventListener('click', () => { //
    sendToContent({ type: 'toggleEraser' }); //
    // Toggle active class on eraser button
    if (eraserBtn.classList.contains('active')) {
      setActiveToolButton('brushBtn'); // If eraser was active, switch to brush
    } else {
      setActiveToolButton('eraserBtn'); // Activate eraser
    }
  });

  undoBtn.addEventListener('click', () => { //
    sendToContent({ type: 'undo' }); //
  });

  redoBtn.addEventListener('click', () => { //
    sendToContent({ type: 'redo' }); //
  });

  saveBtn.addEventListener('click', () => { //
    sendToContent({ type: 'saveImage' }); //
  });

  clearAllBtn.addEventListener('click', () => {
    sendToContent({ type: 'clearAll' });
  });

  let isDrawingCurrentlyActive = true; // Local state for the toggle button
  toggleDrawingBtn.addEventListener('click', () => {
    isDrawingCurrentlyActive = !isDrawingCurrentlyActive;
    sendToContent({ type: 'toggleDrawing', activate: isDrawingCurrentlyActive });
    toggleDrawingBtn.textContent = isDrawingCurrentlyActive ? 'Deactivate Drawing' : 'Activate Drawing';
    toggleDrawingBtn.classList.toggle('active', !isDrawingCurrentlyActive); // Highlight when *deactivated*
  });

  // --- Initial State Synchronization (When popup opens) ---
  // Request current state from content script when popup loads
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'getToolState' }, (response) => {
        if (response) {
          colorPicker.value = response.brushColor;
          brushSizeSlider.value = response.brushSize;
          if (response.currentTool === 'eraser') {
            setActiveToolButton('eraserBtn');
          } else {
            setActiveToolButton('brushBtn'); // Default to brush if no specific tool or brush selected
          }
          isDrawingCurrentlyActive = response.isDrawingActive;
          toggleDrawingBtn.textContent = isDrawingCurrentlyActive ? 'Deactivate Drawing' : 'Activate Drawing';
          toggleDrawingBtn.classList.toggle('active', !isDrawingCurrentlyActive);
        } else {
          // If no response (e.g., content script not yet injected), assume default active state
          setActiveToolButton('brushBtn');
          toggleDrawingBtn.classList.remove('active'); // Ensure it's not highlighted initially if active
          toggleDrawingBtn.textContent = 'Deactivate Drawing';
        }
      });
    }
  });
});