// content/floating_ui.js - Manages the floating toolbar UI for ScreenDraw.
// This script runs in the MAIN world of the webpage.

// Ensure drawing_core.js is loaded and accessible via its exposed global object
// If not, log an error and stop execution, as the UI depends on the core.
// This check is crucial for the race condition.
if (typeof window.ScreenDrawDrawingCore === 'undefined') {
  console.error("ScreenDraw Floating UI: drawing_core.js not loaded or exposed. Floating UI cannot initialize.");
  // Throwing an error here will stop this script from executing further,
  // preventing "Cannot read properties of undefined" errors.
  throw new Error("ScreenDraw Drawing Core (window.ScreenDrawDrawingCore) not found. UI cannot function.");
}

const DrawingCore = window.ScreenDrawDrawingCore; // Reference to the drawing core functions

let toolbar = null; // Reference to the floating toolbar DOM element
let isToolbarVisible = false; // Tracks the current visibility state of the toolbar

// --- UI Creation and Initialization ---

/**
 * Creates and appends the floating toolbar to the document body.
 * Prevents duplicates if called multiple times.
 */
function createToolbar() {
  // Check if toolbar already exists to prevent duplicates on re-injection
  let existingToolbar = document.getElementById('screendraw-toolbar');
  if (existingToolbar) {
    toolbar = existingToolbar;
    console.log('ScreenDraw Floating UI: Reusing existing toolbar.');
  } else {
    toolbar = document.createElement('div');
    toolbar.id = 'screendraw-toolbar'; // Assign a unique ID
    toolbar.classList.add('screendraw-toolbar-base'); // Add a base class for CSS styling
    // Set initial inline styles (can be overridden by CSS)
    toolbar.style.position = 'fixed';
    toolbar.style.top = '20px';
    toolbar.style.right = '20px';
    toolbar.style.zIndex = '1000000'; // Higher z-index than canvas to be on top
    toolbar.style.display = 'flex'; // Use flexbox for layout
    toolbar.style.flexDirection = 'column'; // Stack items vertically
    toolbar.style.gap = '8px'; // Spacing between elements
    toolbar.style.opacity = '0'; // Start hidden for smooth fade-in
    toolbar.style.transition = 'opacity 0.3s ease-in-out'; // Smooth transition

    // Populate the toolbar with HTML controls
    toolbar.innerHTML = `
      <div class="screendraw-control-group">
        <label for="screendraw-colorPicker">Color:</label>
        <input type="color" id="screendraw-colorPicker" value="#000000" />
      </div>
      <div class="screendraw-control-group">
        <label for="screendraw-brushSize">Size:</label>
        <input type="range" id="screendraw-brushSize" min="1" max="20" value="5" />
      </div>
      <div class="screendraw-button-group">
        <button id="screendraw-brushBtn" class="screendraw-tool-button">Brush</button>
        <button id="screendraw-eraserBtn" class="screendraw-tool-button">Eraser</button>
      </div>
      <hr class="screendraw-separator">
      <div class="screendraw-button-group">
        <button id="screendraw-undoBtn" title="Undo Last Stroke">Undo</button>
        <button id="screendraw-redoBtn" title="Redo Last Stroke">Redo</button>
        <button id="screendraw-clearAllBtn" title="Clear All Drawings">Clear All</button>
      </div>
      <hr class="screendraw-separator">
      <button id="screendraw-saveBtn" class="screendraw-action-button" title="Save Drawing as Image">Save Image</button>
      <button id="screendraw-hideBtn" class="screendraw-action-button" title="Hide Drawing Tools">Hide Tools</button>
    `;
    document.body.appendChild(toolbar); // Append the toolbar to the body
    console.log('ScreenDraw Floating UI: Created new toolbar.');
  }

  attachToolbarEventListeners(); // Attach event listeners to the controls
  // Initial state: Toolbar starts hidden until explicitly shown by background script
  toggleToolbarVisibility(false);
  updateToolbarUI(); // Sync UI with drawing core's initial state
}

// --- Event Listener Management ---

/**
 * Attaches event listeners to all interactive elements within the toolbar.
 * Ensures listeners are only added once by removing them before re-adding.
 */
function attachToolbarEventListeners() {
  const colorPicker = document.getElementById('screendraw-colorPicker');
  const brushSizeSlider = document.getElementById('screendraw-brushSize');
  const brushBtn = document.getElementById('screendraw-brushBtn');
  const eraserBtn = document.getElementById('screendraw-eraserBtn');
  const undoBtn = document.getElementById('screendraw-undoBtn');
  const redoBtn = document.getElementById('screendraw-redoBtn');
  const clearAllBtn = document.getElementById('screendraw-clearAllBtn');
  const saveBtn = document.getElementById('screendraw-saveBtn');
  const hideBtn = document.getElementById('screendraw-hideBtn');

  // Remove existing listeners to prevent duplicates if attachToolbarEventListeners is called multiple times
  colorPicker.removeEventListener('input', handleColorChange);
  colorPicker.removeEventListener('change', handleColorChange);
  brushSizeSlider.removeEventListener('input', handleSizeChange);
  brushBtn.removeEventListener('click', handleBrushClick);
  eraserBtn.removeEventListener('click', handleEraserClick);
  undoBtn.removeEventListener('click', handleUndoClick);
  redoBtn.removeEventListener('click', handleRedoClick);
  clearAllBtn.removeEventListener('click', handleClearAllClick);
  saveBtn.removeEventListener('click', handleSaveClick);
  hideBtn.removeEventListener('click', handleHideClick);

  // Add new event listeners
  colorPicker.addEventListener('input', handleColorChange);
  colorPicker.addEventListener('change', handleColorChange);
  brushSizeSlider.addEventListener('input', handleSizeChange);
  brushBtn.addEventListener('click', handleBrushClick);
  eraserBtn.addEventListener('click', handleEraserClick);
  undoBtn.addEventListener('click', handleUndoClick);
  redoBtn.addEventListener('click', handleRedoClick);
  clearAllBtn.addEventListener('click', handleClearAllClick);
  saveBtn.addEventListener('click', handleSaveClick);
  hideBtn.addEventListener('click', handleHideClick);
}

// --- Event Handlers (Delegating to DrawingCore) ---

function handleColorChange(e) {
  DrawingCore.setBrushColor(e.target.value);
  updateToolbarUI(); // Update active tool button
}

function handleSizeChange(e) {
  DrawingCore.setBrushSize(parseInt(e.target.value));
}

function handleBrushClick() {
  // Re-send current color to ensure brush mode is active in DrawingCore
  DrawingCore.setBrushColor(document.getElementById('screendraw-colorPicker').value);
  updateToolbarUI(); // Update active tool button
}

function handleEraserClick() {
  DrawingCore.toggleEraserTool();
  updateToolbarUI(); // Update active tool button
}

function handleUndoClick() {
  DrawingCore.undoLastStroke();
}

function handleRedoClick() {
  DrawingCore.redoLastStroke();
}

function handleClearAllClick() {
  DrawingCore.clearAllDrawings();
}

function handleSaveClick() {
  DrawingCore.saveImage();
}

/**
 * Handles the click on the 'Hide Tools' button.
 * Hides the toolbar and informs the background script about the state change.
 */
function handleHideClick() {
  toggleToolbarVisibility(false); // Hide the toolbar
  // Inform main_content_script.js (via window.postMessage) that tools are now hidden
  // main_content_script.js will then forward this to background.js
  window.postMessage({ type: 'SCREEN_DRAW_FLOATING_UI_STATE_UPDATE', isVisible: false }, '*');
}

// --- Toolbar UI State Synchronization ---

/**
 * Updates the visual state of the toolbar controls (e.g., active tool button, slider values)
 * by querying the current state from the DrawingCore.
 */
function updateToolbarUI() {
  const currentState = DrawingCore.getCurrentState();
  const brushBtn = document.getElementById('screendraw-brushBtn');
  const eraserBtn = document.getElementById('screendraw-eraserBtn');

  // Update active tool button styling
  if (brushBtn && eraserBtn) {
    if (currentState.currentTool === 'eraser') {
      brushBtn.classList.remove('active');
      eraserBtn.classList.add('active');
    } else {
      brushBtn.classList.add('active');
      eraserBtn.classList.remove('active');
    }
  }
  // Sync color and size sliders with current DrawingCore state
  const colorPicker = document.getElementById('screendraw-colorPicker');
  const brushSizeSlider = document.getElementById('screendraw-brushSize');
  if (colorPicker) colorPicker.value = currentState.brushColor;
  if (brushSizeSlider) brushSizeSlider.value = currentState.brushSize;
}

// --- Toolbar Visibility Toggle (Controlled by main_content_script.js) ---

/**
 * Toggles the visibility of the floating toolbar and activates/deactivates canvas interaction.
 * This function is called by messages from main_content_script.js (via window.postMessage).
 * @param {boolean} show - True to show the toolbar, false to hide it.
 */
function toggleToolbarVisibility(show) {
  if (toolbar) {
    toolbar.style.opacity = show ? '1' : '0'; // Fade in/out
    toolbar.style.pointerEvents = show ? 'auto' : 'none'; // Allow/disallow interaction with toolbar itself
    isToolbarVisible = show;
    // Activate/deactivate canvas interaction based on toolbar visibility
    DrawingCore.setCanvasInteraction(show);
    if (show) {
      updateToolbarUI(); // Sync UI with drawing core state when toolbar is shown
    }
    console.log('ScreenDraw Floating UI: Toolbar visibility set to', show);
  }
}

// --- Cross-World Message Listener (from main_content_script.js) ---

// Listen for messages from the main_content_script.js (which is in isolated world)
// These messages are sent using window.postMessage for cross-world communication.
window.addEventListener('message', (event) => {
  // Ensure the message is from the expected source (the window itself) and has the correct type
  if (event.source === window && event.data) {
    if (event.data.type === 'SCREEN_DRAW_TOGGLE_VISIBILITY_REQUEST') {
      toggleToolbarVisibility(event.data.show);
    } else if (event.data.type === 'SCREEN_DRAW_CLEANUP_REQUEST') {
      console.log('ScreenDraw Floating UI: Cleanup request received.');
      // Remove toolbar from DOM
      if (toolbar && toolbar.parentNode) {
        toolbar.parentNode.removeChild(toolbar);
        console.log('ScreenDraw Floating UI: Toolbar removed from DOM.');
      }
      toolbar = null;
      isToolbarVisible = false;
      // Confirm cleanup back to main_content_script.js
      window.postMessage({ type: 'SCREEN_DRAW_CLEANUP_CONFIRMED' }, '*');
    }
  }
});


// --- Initial Script Execution ---
// This code runs immediately when floating_ui.js is injected into the main world.
createToolbar();
console.log('ScreenDraw Floating UI: Initialized. Toolbar created and hidden by default.');
