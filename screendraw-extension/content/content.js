(function () {
  if (window.__drawInjected) return;
  window.__drawInjected = true;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.zIndex = 1000000;
  canvas.style.pointerEvents = "auto";
  canvas.id = "screen-draw-canvas";

  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let painting = false;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  function startPosition(e) {
    if (e.ctrlKey) return;
    painting = true;
    draw(e);
  }

  function endPosition() {
    painting = false;
    ctx.beginPath();
  }

  function draw(e) {
    if (!painting || e.ctrlKey) return;

    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0015ffea";

    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
  }

  canvas.addEventListener("mousedown", startPosition);
  canvas.addEventListener("mouseup", endPosition);
  canvas.addEventListener("mousemove", draw);

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
})();

