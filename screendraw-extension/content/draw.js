// contents/draw.js

(function () {
  // Check if already injected
  if (document.getElementById('screen-draw-canvas')) return;

  // State
  let isDrawing = false;
  let prevX = 0, prevY = 0;
  let ctrlPressed = false;
  const paths = [];
  let currentPath = [];

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'screen-draw-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '999999';
  canvas.style.pointerEvents = 'auto';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  document.body.appendChild(canvas);

  // Mouse Events
  canvas.addEventListener('mousedown', (e) => {
    if (ctrlPressed) return;
    isDrawing = true;
    prevX = e.clientX;
    prevY = e.clientY;
    currentPath = [[prevX, prevY]];
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || ctrlPressed) return;

    const x = e.clientX;
    const y = e.clientY;

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();

    prevX = x;
    prevY = y;
    currentPath.push([x, y]);
  });

  canvas.addEventListener('mouseup', () => {
    if (isDrawing && !ctrlPressed) {
      paths.push(currentPath);
      currentPath = [];
    }
    isDrawing = false;
  });

  // Listen for Ctrl Key
  document.addEventListener('keydown', (e) => {
    if (e.key === "Control") ctrlPressed = true;
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === "Control") ctrlPressed = false;
  });

  // Handle Resize
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

})();


// === TOOLBAR UI ===
const toolbar = document.createElement('div');
toolbar.style.position = 'fixed';
toolbar.style.top = '20px';
toolbar.style.right = '20px';
toolbar.style.zIndex = '1000000';
toolbar.style.background = 'rgba(0, 0, 0, 0.7)';
toolbar.style.color = '#fff';
toolbar.style.padding = '10px';
toolbar.style.borderRadius = '8px';
toolbar.style.display = 'flex';
toolbar.style.gap = '10px';
toolbar.style.fontFamily = 'sans-serif';

const buttons = [
  { id: 'pen', text: '🖌️' },
  { id: 'eraser', text: '🩹' },
  { id: 'undo', text: '↩️' },
  { id: 'redo', text: '↪️' },
  { id: 'clear', text: '❌' },
  { id: 'exit', text: '🚪' }
];

buttons.forEach(({ id, text }) => {
  const btn = document.createElement('button');
  btn.innerText = text;
  btn.id = id;
  btn.style.padding = '6px 10px';
  btn.style.border = 'none';
  btn.style.borderRadius = '4px';
  btn.style.cursor = 'pointer';
  btn.style.background = '#444';
  btn.style.color = 'white';
  btn.addEventListener('mouseover', () => btn.style.background = '#666');
  btn.addEventListener('mouseout', () => btn.style.background = '#444');
  toolbar.appendChild(btn);
});

document.body.appendChild(toolbar);


// === STATE FOR UNDO/REDO ===
const undoStack = [];
const redoStack = [];

// === BUTTON LOGIC ===
document.getElementById('pen').onclick = () => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'red';
};

document.getElementById('eraser').onclick = () => {
  ctx.globalCompositeOperation = 'destination-out'; // Erase pixels
  ctx.lineWidth = 10;
};

document.getElementById('undo').onclick = () => {
  if (paths.length > 0) {
    redoStack.push(paths.pop());
    redraw();
  }
};

document.getElementById('redo').onclick = () => {
  if (redoStack.length > 0) {
    paths.push(redoStack.pop());
    redraw();
  }
};

document.getElementById('clear').onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  paths.length = 0;
  redoStack.length = 0;
};

document.getElementById('exit').onclick = () => {
  canvas.remove();
  toolbar.remove();
};


function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  paths.forEach(path => {
    ctx.beginPath();
    for (let i = 1; i < path.length; i++) {
      ctx.moveTo(path[i - 1][0], path[i - 1][1]);
      ctx.lineTo(path[i][0], path[i][1]);
    }
    ctx.stroke();
  });
}
