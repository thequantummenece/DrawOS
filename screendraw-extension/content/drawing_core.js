// content/drawing_core.js - The core drawing engine for ScreenDraw.
// This script runs in the MAIN world of the webpage.

// --- Global State Variables ---
// These variables are declared outside of functions to maintain their state
// across calls within this single, persistent script execution.
let drawing = false; // True when mouse is down and drawing
let currentTool = 'brush'; // Current active tool: 'brush', 'eraser' (expandable for shapes)
let brushColor = '#000000'; // Default brush color
let brushSize = 5; // Default brush size
let ctx = null; // 2D rendering context of the canvas
let canvas = null; // The drawing canvas element
let paths = []; // Stores all drawn paths for redraw, undo, and redo functionality.
                // Each path is an array of points: [{x, y, color, size, tool}, ...]
let redoStack = []; // Stores paths that have been undone, for redo functionality.
let isCanvasActive = false; // Controls if the canvas is currently interactable (pointerEvents: 'auto').

// --- Canvas Setup and Lifecycle Management ---

/**
 * Initializes or re-initializes the drawing canvas.
 * Ensures only one canvas exists and attaches/detaches event listeners.
 * This function is designed to be called once when the script is first loaded.
 */
function setupCanvas() {
  // Check if canvas already exists to prevent creating duplicates on subsequent calls
  // (though with the new architecture, this script should only be run once per page).
  let existingCanvas = document.getElementById('screendraw-canvas');
  if (existingCanvas) {
    canvas = existingCanvas;
    ctx = canvas.getContext('2d');
    console.log('ScreenDraw Core: Reusing existing canvas.');
  } else {
    canvas = document.createElement('canvas');
    canvas.id = 'screendraw-canvas'; // Assign a unique ID for easy identification
    canvas.style.position = 'fixed'; // Position fixed to cover the viewport
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw'; // Ensure it covers full viewport width
    canvas.style.height = '100vh'; // Ensure it covers full viewport height
    canvas.style.zIndex = '999999'; // High z-index to ensure it's on top of page content
    canvas.style.pointerEvents = 'none'; // Start with pointer events off by default (no interaction)
    canvas.style.cursor = 'crosshair'; // Default cursor for drawing mode
    document.body.appendChild(canvas); // Append canvas to the body
    ctx = canvas.getContext('2d');
    console.log('ScreenDraw Core: Created new canvas.');
  }

  // Remove old event listeners to prevent duplicates if setupCanvas is called multiple times
  // (Important for robustness even if not expected with this architecture)
  canvas.removeEventListener('mousedown', startDrawing);
  canvas.removeEventListener('mouseup', stopDrawing);
  canvas.removeEventListener('mousemove', draw);
  window.removeEventListener('resize', handleResize); // Listen to window resize, not canvas element resize

  // Add new event listeners for drawing interactions
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mousemove', draw);
  window.addEventListener('resize', handleResize); // Adjust canvas size on window resize

  // Set initial canvas interaction state (initially inactive)
  setCanvasInteraction(false);
}

/**
 * Handles window resize events to adjust canvas dimensions and redraw content.
 */
function handleResize() {
  if (canvas && ctx) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redrawPaths(); // Redraw all paths to fit the new canvas dimensions
  }
}

/**
 * Toggles the interactive state of the canvas.
 * When active, mouse events are captured for drawing. When inactive, they pass through to the page.
 * @param {boolean} active - True to activate interaction, false to deactivate.
 */
function setCanvasInteraction(active) {
  isCanvasActive = active;
  if (canvas) {
    canvas.style.pointerEvents = isCanvasActive ? 'auto' : 'none'; // 'auto' captures events, 'none' lets them pass through
    // Set appropriate cursor based on active tool when interaction is enabled
    canvas.style.cursor = isCanvasActive ? (currentTool === 'eraser' ? 'cell' : 'crosshair') : 'default';
  }
  console.log('ScreenDraw Core: Canvas interaction set to', active);
}

// --- Drawing Event Handlers ---

/**
 * Initiates a new drawing stroke when the mouse button is pressed down on the canvas.
 * @param {MouseEvent} e - The mousedown event object.
 */
function startDrawing(e) {
  if (!isCanvasActive) return; // Only start drawing if canvas interaction is enabled
  drawing = true;
  redoStack = []; // Clear redo stack on any new drawing action (as new action breaks redo history)
  ctx.beginPath(); // Start a new path for the current stroke

  // Set the global composite operation based on the current tool
  // 'destination-out' makes new drawing erase existing pixels
  // 'source-over' makes new drawing paint over existing pixels
  if (currentTool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.moveTo(e.clientX, e.clientY); // Move to the starting point of the stroke
  // Store the starting point of the new path, including current tool properties
  paths.push([{
    x: e.clientX,
    y: e.clientY,
    color: brushColor,
    size: brushSize,
    tool: currentTool // Store which tool was used for this path
  }]);
}

/**
 * Stops the current drawing stroke when the mouse button is released.
 */
function stopDrawing() {
  drawing = false;
  ctx.closePath(); // Close the current path
}

/**
 * Continues drawing the current stroke as the mouse moves.
 * @param {MouseEvent} e - The mousemove event object.
 */
function draw(e) {
  if (!drawing || !isCanvasActive) return; // Only draw if actively drawing and canvas is active

  ctx.lineWidth = brushSize; // Set line thickness
  ctx.strokeStyle = brushColor; // Set line color (even for eraser, as it's used for redraw)

  ctx.lineTo(e.clientX, e.clientY); // Draw a line to the current mouse position
  ctx.stroke(); // Apply the stroke

  // Add the current point to the last path in the paths array
  paths[paths.length - 1].push({
    x: e.clientX,
    y: e.clientY,
    color: brushColor,
    size: brushSize,
    tool: currentTool
  });
}

/**
 * Clears the entire canvas and redraws all stored paths.
 * This is essential for undo/redo, resize, and initial rendering.
 */
function redrawPaths() {
  if (!canvas || !ctx) return; // Ensure canvas and context are available

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire canvas

  // Reset global composite operation to 'source-over' before redrawing everything.
  // This ensures previous eraser strokes are properly re-applied as transparent areas.
  ctx.globalCompositeOperation = 'source-over';

  // Iterate through all stored paths and redraw them
  for (let path of paths) {
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const pt = path[i];
      ctx.strokeStyle = pt.color; // Set color for this path segment
      ctx.lineWidth = pt.size; // Set size for this path segment

      // Apply the correct composite operation based on the tool used for this specific path segment
      if (pt.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'; // Erase effect
      } else {
        ctx.globalCompositeOperation = 'source-over'; // Drawing effect
      }

      if (i === 0) ctx.moveTo(pt.x, pt.y); // Move to the first point of the segment
      else ctx.lineTo(pt.x, pt.y); // Draw a line to subsequent points
    }
    ctx.stroke(); // Apply the stroke for the current path
    ctx.closePath(); // Close the path
  }
  // After redrawing all paths, ensure the composite operation is set correctly
  // for the *next* drawing action based on the currently selected tool.
  if (currentTool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }
}

// --- Publicly Exposed Functions (for floating_ui.js to call) ---
// These functions are exposed globally so the floating UI can interact with the drawing core.

/**
 * Sets the brush color and switches the current tool to 'brush'.
 * @param {string} color - The new color in hex format (e.g., '#RRGGBB').
 */
function setBrushColor(color) {
  brushColor = color;
  currentTool = 'brush'; // Selecting a color means switching to brush mode
  ctx.globalCompositeOperation = 'source-over'; // Ensure drawing mode
  if (canvas) canvas.style.cursor = 'crosshair'; // Update cursor
  console.log('ScreenDraw Core: Color set to', color);
}

/**
 * Sets the brush size.
 * @param {number} size - The new brush size in pixels.
 */
function setBrushSize(size) {
  brushSize = size;
  console.log('ScreenDraw Core: Brush size set to', size);
}

/**
 * Toggles between 'brush' and 'eraser' tools.
 */
function toggleEraserTool() {
  currentTool = (currentTool === 'eraser') ? 'brush' : 'eraser'; // Toggle the tool
  if (currentTool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'; // Set to erase mode
    if (canvas) canvas.style.cursor = 'cell'; // Change cursor for eraser
    console.log('ScreenDraw Core: Eraser ON');
  } else {
    ctx.globalCompositeOperation = 'source-over'; // Set to brush mode
    if (canvas) canvas.style.cursor = 'crosshair'; // Change cursor back for brush
    console.log('ScreenDraw Core: Eraser OFF');
  }
}

/**
 * Undoes the last drawing stroke.
 */
function undoLastStroke() {
  if (paths.length > 0) {
    redoStack.push(paths.pop()); // Move last path to redo stack
    redrawPaths(); // Redraw the canvas without the undone path
    console.log('ScreenDraw Core: Undo action performed.');
  } else {
    console.log('ScreenDraw Core: Nothing to undo.');
  }
}

/**
 * Redoes the last undone drawing stroke.
 */
function redoLastStroke() {
  if (redoStack.length > 0) {
    paths.push(redoStack.pop()); // Move path from redo stack back to paths
    redrawPaths(); // Redraw the canvas with the redone path
    console.log('ScreenDraw Core: Nothing to redo.');
  } else {
    console.log('ScreenDraw Core: Nothing to redo.');
  }
}

/**
 * Clears all drawings from the canvas.
 */
function clearAllDrawings() {
  paths = []; // Empty the paths array
  redoStack = []; // Empty the redo stack
  if (ctx && canvas) { // Ensure context and canvas exist before clearing
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the actual canvas pixels
  }
  ctx.globalCompositeOperation = 'source-over'; // Reset composite operation
  console.log('ScreenDraw Core: All drawings cleared.');
}

/**
 * Saves the current canvas content as a PNG image.
 */
function saveImage() {
  if (!canvas) {
    console.error("ScreenDraw Core: Canvas not available for saving.");
    return;
  }
  const link = document.createElement('a');
  link.download = 'screendraw.png'; // Default filename
  link.href = canvas.toDataURL(); // Get data URL of the canvas content
  link.click(); // Programmatically click the link to trigger download
  console.log('ScreenDraw Core: Image save initiated.');
}

/**
 * Returns the current state of the drawing core.
 * @returns {object} An object containing current brush color, size, tool, and canvas active status.
 */
function getCurrentState() {
  return {
    brushColor: brushColor,
    brushSize: brushSize,
    currentTool: currentTool,
    isCanvasActive: isCanvasActive
  };
}

// --- Initial Setup and Cleanup Listener ---

// This code runs immediately when drawing_core.js is injected into the main world.
// It will only set up the canvas if it doesn't already exist.
setupCanvas();
console.log('ScreenDraw Core: Initialized in main world.');

// Listen for cleanup requests from the main_content_script.js (via window.postMessage)
// This is crucial for removing the canvas when the user deactivates the tools.
window.addEventListener('message', (event) => {
  // Ensure the message is from the same window and is the expected cleanup request
  if (event.source === window && event.data && event.data.type === 'SCREEN_DRAW_CLEANUP_REQUEST') {
    console.log('ScreenDraw Core: Cleanup request received.');
    // Remove canvas from DOM
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
      console.log('ScreenDraw Core: Canvas removed from DOM.');
    }
    // Remove event listeners to prevent memory leaks
    window.removeEventListener('resize', handleResize);
    if (canvas) { // Check if canvas reference is still valid before removing its listeners
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mousemove', draw);
    }
    // Reset internal state variables (important for next activation)
    drawing = false;
    currentTool = 'brush';
    brushColor = '#000000';
    brushSize = 5;
    paths = [];
    redoStack = [];
    isCanvasActive = false;
    ctx = null;
    canvas = null; // Clear canvas reference
    console.log('ScreenDraw Core: Cleaned up.');
    // Confirm cleanup back to the main_content_script.js
    window.postMessage({ type: 'SCREEN_DRAW_CLEANUP_CONFIRMED' }, '*');
  }
});

// --- Expose Public API ---
// Expose functions and state getters globally for floating_ui.js to access.
// This is how scripts injected into the same 'MAIN' world communicate.
window.ScreenDrawDrawingCore = {
  setBrushColor,
  setBrushSize,
  toggleEraserTool,
  undoLastStroke,
  redoLastStroke,
  clearAllDrawings,
  saveImage,
  setCanvasInteraction, // Function to activate/deactivate canvas interaction
  getCurrentState // Function to get current state
};
