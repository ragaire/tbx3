/* Line-wave title, same effect as kinfogaming.com.
 * Adapted from BL/S® Studio's Interactive Line Text Distortion on Hover.
 * https://codepen.io/blacklead-studio/pen/azOzePJ
 * MIT license: wave.LICENSE. Font license: fonts/OFL.txt.
 * Changed: draws whatever text is in the <h1>, keeping its proportions.
 */
(() => {
  'use strict';
  const wrapper = document.querySelector('.wave');
  const canvas = wrapper.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = { x: -9999, y: -9999 };
  let lines = [], width = 0, height = 0, frame = 0, last = 0;

  function draw() {
    context.clearRect(0, 0, width, height);
    context.strokeStyle = '#ffdfc4';
    context.lineWidth = width < 600 ? 0.65 : 0.6;
    for (const line of lines) {
      context.beginPath();
      context.moveTo(line[0].x, line[0].y);
      for (let i = 1; i < line.length; i++) {
        const prev = line[i - 1], point = line[i];
        context.quadraticCurveTo(prev.x, prev.y, (prev.x + point.x) / 2, (prev.y + point.y) / 2);
      }
      const end = line[line.length - 1];
      context.lineTo(end.x, end.y);
      context.stroke();
    }
  }

  function resize() {
    const text = wrapper.querySelector('h1').textContent.trim() || 'TBX3';
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);

    // Render the word into a small mask; the mask is stretched over the canvas,
    // so size the word to keep its real shape at the canvas aspect ratio.
    const MW = 420, MH = 100;
    const map = document.createElement('canvas');
    map.width = MW;
    map.height = MH;
    const type = map.getContext('2d', { willReadFrequently: true });
    type.font = '80px Archivo, Arial Black, sans-serif';
    const metrics = type.measureText(text);
    const capHeight = metrics.actualBoundingBoxAscent || 60;
    const paddingX = width * 0.04;
    const paddingY = height * 0.09;
    const aspect = ((height - 2 * paddingY) / MH) / ((width - 2 * paddingX) / MW);
    const sy = 60 / capHeight;
    const sx = Math.min(390 / metrics.width, sy * aspect);
    type.translate(MW / 2, 78);
    type.scale(sx, sy);
    type.fillStyle = '#fff';
    type.textAlign = 'center';
    type.fillText(text, 0, 0);
    const pixels = type.getImageData(0, 0, MW, MH).data;

    const rows = width < 600 ? 58 : 76;
    const cols = Math.max(100, Math.min(440, Math.ceil(width / 4)));
    const lift = Math.min(30, Math.max(12, width * 0.023));
    lines = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols + 1 }, (_, col) => {
        const x = paddingX + col / cols * (width - 2 * paddingX);
        const pixelX = Math.min(MW - 1, Math.floor(col / cols * MW));
        const pixelY = Math.min(MH - 1, Math.floor(row / (rows - 1) * MH));
        const brightness = pixels[(pixelY * MW + pixelX) * 4 + 3] / 255;
        const y = paddingY + row / (rows - 1) * (height - 2 * paddingY) - brightness * lift;
        return { x, y, baseX: x, baseY: y };
      })
    );
    mouse.x = mouse.y = -9999;
    draw();
    wrapper.classList.add('ready');
  }

  function animate(now) {
    frame = 0;
    if (document.hidden || reduced.matches) return;
    const step = Math.min((now - last) / 16.667 || 1, 2);
    last = now;
    const spring = 1 - Math.pow(0.9, step);
    const radius = Math.min(145, Math.max(65, width * 0.11));
    let moving = false;
    for (const line of lines) {
      for (const point of line) {
        const dx = point.x - mouse.x, dy = point.y - mouse.y;
        const distance = Math.hypot(dx, dy);
        if (distance < radius) {
          const force = (1 - distance / radius) * 9 * step;
          point.x += dx / (distance || 1) * force;
          point.y += dy / (distance || 1) * force;
        }
        point.x += (point.baseX - point.x) * spring;
        point.y += (point.baseY - point.y) * spring;
        if (Math.abs(point.x - point.baseX) + Math.abs(point.y - point.baseY) > 0.08) moving = true;
        else { point.x = point.baseX; point.y = point.baseY; }
      }
    }
    draw();
    if (moving) frame = requestAnimationFrame(animate);
  }

  function start() {
    if (!frame && !reduced.matches && !document.hidden) {
      last = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    start();
  }
  function release() { mouse.x = mouse.y = -9999; start(); }
  canvas.addEventListener('pointermove', point, { passive: true });
  canvas.addEventListener('pointerdown', point, { passive: true });
  canvas.addEventListener('pointerleave', release);
  canvas.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') release(); });
  canvas.addEventListener('pointercancel', release);
  document.addEventListener('visibilitychange', release);
  reduced.addEventListener('change', resize);
  new ResizeObserver(resize).observe(wrapper);
  document.fonts.load('80px Archivo').then(resize).catch(resize);
})();
