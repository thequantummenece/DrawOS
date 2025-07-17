// === DRAW.JS ===

// Create and insert canvas
const canvas = document.createElement('canvas');
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '999999';
canvas.style.pointerEvents = 'none';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');
ctx.strokeStyle = 'red';
ctx.lineWidth = 2;
ctx.lineCap = 'round';

let drawing = false;
let currentPath = [];
let paths = [];
let redoStack = [];

// Enable pointer events when drawing
function enableDrawMode() {
  canvas.style.pointerEvents = 'auto';
}

// Mouse Events
canvas.addEventListener('mousedown', (e) => {
  drawing = true;
  currentPath = [[e.clientX, e.clientY]];
});

canvas.addEventListener('mousemove', (e) => {
  if (!drawing) return;
  const point = [e.clientX, e.clientY];
  currentPath.push(point);
  ctx.lineTo(...point);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(...point);
});

canvas.addEventListener('mouseup', () => {
  drawing = false;
  ctx.beginPath();
  if (currentPath.length > 0) {
    paths.push(currentPath);
    redoStack = []; // Clear redo stack after new draw
  }
});

// === REDRAW FUNCTION ===
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.globalCompositeOperation = 'source-over';

  paths.forEach(path => {
    ctx.beginPath();
    for (let i = 1; i < path.length; i++) {
      ctx.moveTo(path[i - 1][0], path[i - 1][1]);
      ctx.lineTo(path[i][0], path[i][1]);
    }
    ctx.stroke();
  });
}

// === TOOLBAR ===
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

// === TOOLBAR ACTIONS ===
document.getElementById('pen').onclick = () => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
};

document.getElementById('eraser').onclick = () => {
  ctx.globalCompositeOperation = 'destination-out';
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
  paths = [];
  redoStack = [];
  redraw();
};

document.getElementById('exit').onclick = () => {
  canvas.remove();
  toolbar.remove();
};
