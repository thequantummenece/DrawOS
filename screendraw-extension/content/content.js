let drawing = false;
let currentTool = 'brush'; // New variable to track active tool: 'brush', 'eraser'
let brushColor = '#172be2ff';
let brushSize = 5;
let ctx, canvas;
let paths = [];
let redoStack = [];
let isDrawingActive = true; // New state variable to control if drawing mode is globally active

function setupCanvas() {
  canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.zIndex = 999999;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Initially, pointerEvents is 'auto' if drawing is active, otherwise 'none'
  canvas.style.pointerEvents = isDrawingActive ? 'auto' : 'none'; //
  canvas.style.cursor = 'crosshair';
  document.body.appendChild(canvas);

  ctx = canvas.getContext('2d');
  ctx.lineCap = 'round'; //
  ctx.lineJoin = 'round'; //

  window.addEventListener('resize', () => { //
    canvas.width = window.innerWidth; //
    canvas.height = window.innerHeight; //
    redrawPaths(); //
  });

  canvas.addEventListener('mousedown', startDrawing); //
  canvas.addEventListener('mouseup', stopDrawing); //
  canvas.addEventListener('mousemove', draw); //
}

function startDrawing(e) {
  if (!isDrawingActive) return; // Only start drawing if the mode is active
  drawing = true;
  redoStack = []; // Clear redo stack on new drawing action
  ctx.beginPath(); //

  // Set composite operation for eraser or brush
  if (currentTool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'; // This makes drawn pixels transparent
  } else {
    ctx.globalCompositeOperation = 'source-over'; // Default for drawing
  }

  ctx.moveTo(e.clientX, e.clientY); //
  // Store path data including tool type for proper redraw
  paths.push([{
    x: e.clientX,
    y: e.clientY,
    color: brushColor, // Store actual color even if erasing for redraw
    size: brushSize,
    tool: currentTool // Store which tool was used
  }]);
}

function stopDrawing() {
  drawing = false;
  ctx.closePath(); //
}

function draw(e) {
  if (!drawing) return; //

  ctx.lineWidth = brushSize; //
  // Use brushColor if not erasing, otherwise it's handled by globalCompositeOperation
  ctx.strokeStyle = brushColor; // This will be applied regardless for future redraws

  ctx.lineTo(e.clientX, e.clientY); //
  ctx.stroke(); //

  // Store path data for undo/redo and redraw
  paths[paths.length - 1].push({
    x: e.clientX,
    y: e.clientY,
    color: brushColor,
    size: brushSize,
    tool: currentTool
  });
}

function redrawPaths() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear entire canvas

  // Crucially, set default globalCompositeOperation to 'source-over' before redrawing everything
  ctx.globalCompositeOperation = 'source-over';

  for (let path of paths) {
    ctx.beginPath(); //
    for (let i = 0; i < path.length; i++) {
      const pt = path[i];
      ctx.strokeStyle = pt.color; //
      ctx.lineWidth = pt.size; //

      // Set composite operation for each segment if it was an eraser stroke
      if (pt.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      if (i === 0) ctx.moveTo(pt.x, pt.y); //
      else ctx.lineTo(pt.x, pt.y); //
    }
    ctx.stroke(); //
    ctx.closePath(); //
  }
  // After redrawing, ensure the current drawing tool composite operation is set correctly
  // This is important if a user starts drawing immediately after a redraw
  if (currentTool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }
}

// New function to clear all drawings
function clearAll() {
  paths = []; // Empty paths array
  redoStack = []; // Empty redo stack
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the actual canvas
  // Ensure the composite operation is reset after clearing
  ctx.globalCompositeOperation = 'source-over';
}

// New function to toggle drawing mode
function toggleDrawingMode(activate) {
  isDrawingActive = activate;
  if (isDrawingActive) {
    canvas.style.pointerEvents = 'auto';
    canvas.style.cursor = 'crosshair';
    // If reactivating drawing, ensure the latest tool is set
    ctx.globalCompositeOperation = (currentTool === 'eraser') ? 'destination-out' : 'source-over';
  } else {
    canvas.style.pointerEvents = 'none';
    canvas.style.cursor = 'default'; // Or 'auto', depends on desired UX
  }
}


chrome.runtime.onMessage.addListener((msg) => { //
  switch (msg.type) { //
    case 'setColor': //
      brushColor = msg.color; //
      currentTool = 'brush'; // Selecting a color means going back to brush mode
      // Ensure composite operation is back to default
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'setSize': //
      brushSize = msg.size; //
      break;
    case 'toggleEraser': //
      currentTool = (currentTool === 'eraser') ? 'brush' : 'eraser'; // Toggle between eraser and brush
      // Update the composite operation based on the new tool
      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        canvas.style.cursor = 'cell'; // Change cursor for eraser
      } else {
        ctx.globalCompositeOperation = 'source-over';
        canvas.style.cursor = 'crosshair'; // Change cursor back for brush
      }
      break;
    case 'undo': //
      if (paths.length > 0) { //
        redoStack.push(paths.pop()); //
        redrawPaths(); //
      }
      break;
    case 'redo': //
      if (redoStack.length > 0) { //
        paths.push(redoStack.pop()); //
        redrawPaths(); //
      }
      break;
    case 'saveImage': //
      const link = document.createElement('a'); //
      link.download = 'screendraw.png'; //
      link.href = canvas.toDataURL(); //
      link.click(); //
      break;
    case 'clearAll': // New case for clear all
      clearAll();
      break;
    case 'toggleDrawing': // New case for toggling drawing mode
      toggleDrawingMode(msg.activate);
      break;
    case 'getToolState':
      sendResponse({
          brushColor: brushColor,
          brushSize: brushSize,
          currentTool: currentTool,
          isDrawingActive: isDrawingActive
      });
      return true; // Important: Indicate that you will send a response asynchronously
  }
});

// Remove the Ctrl key listeners as we'll use a UI button for toggling
// document.addEventListener('keydown', (e) => { //
//   if (e.ctrlKey) canvas.style.pointerEvents = 'none'; //
// });
// document.addEventListener('keyup', (e) => { //
//   if (!e.ctrlKey) canvas.style.pointerEvents = 'auto'; //
// });

setupCanvas(); //