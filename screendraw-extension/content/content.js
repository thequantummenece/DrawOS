let drawing = false;
let erasing = false;
let brushColor = '#000000';
let brushSize = 5;
let ctx, canvas;
let paths = [];
let redoStack = [];

function setupCanvas() {
  canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.zIndex = 999999;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.pointerEvents = 'auto';
  canvas.style.cursor = 'crosshair';
  document.body.appendChild(canvas);

  ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redrawPaths();
  });

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mousemove', draw);
}

function startDrawing(e) {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.clientX, e.clientY);
  paths.push([{ x: e.clientX, y: e.clientY, color: ctx.strokeStyle, size: ctx.lineWidth }]);
}

function stopDrawing() {
  drawing = false;
  ctx.closePath();
}

function draw(e) {
  if (!drawing) return;
  ctx.lineWidth = brushSize;
  ctx.strokeStyle = erasing ? '#ffffff' : brushColor;

  ctx.lineTo(e.clientX, e.clientY);
  ctx.stroke();
  paths[paths.length - 1].push({ x: e.clientX, y: e.clientY, color: ctx.strokeStyle, size: ctx.lineWidth });
}

function redrawPaths() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let path of paths) {
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const pt = path[i];
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = pt.size;
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.closePath();
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  switch (msg.type) {
    case 'setColor':
      brushColor = msg.color;
      erasing = false;
      break;
    case 'setSize':
      brushSize = msg.size;
      break;
    case 'toggleEraser':
      erasing = !erasing;
      break;
    case 'undo':
      if (paths.length > 0) {
        redoStack.push(paths.pop());
        redrawPaths();
      }
      break;
    case 'redo':
      if (redoStack.length > 0) {
        paths.push(redoStack.pop());
        redrawPaths();
      }
      break;
    case 'saveImage':
      const link = document.createElement('a');
      link.download = 'screendraw.png';
      link.href = canvas.toDataURL();
      link.click();
      break;
  }
});

// Ctrl disables drawing
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey) canvas.style.pointerEvents = 'none';
});
document.addEventListener('keyup', (e) => {
  if (!e.ctrlKey) canvas.style.pointerEvents = 'auto';
});

setupCanvas();
