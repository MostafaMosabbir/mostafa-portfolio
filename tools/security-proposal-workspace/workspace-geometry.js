/* One decorative 3D wireframe for the workspace.
 * No assessment data is read or sent anywhere by this animation.
 */
(() => {
  'use strict';
  const canvas = document.querySelector('.workspace-geometry');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  // An icosahedron has 12 vertices. The golden ratio gives its proportions.
  const phi = (1 + Math.sqrt(5)) / 2;
  const vertices = [];
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      vertices.push([0, a, b * phi], [a, b * phi, 0], [a * phi, 0, b]);
    }
  }
  // Its nearest neighbors are exactly two units apart in this coordinate set.
  const edges = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const distanceSquared = vertices[i].reduce((sum, value, axis) => sum + (value - vertices[j][axis]) ** 2, 0);
      if (Math.abs(distanceSquared - 4) < 0.001) edges.push([i, j]);
    }
  }

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let visible = true;
  let width = 1;
  let height = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw();
  }

  // Rotate in three dimensions, then use depth to project onto the screen.
  function point(vertex, seconds) {
    let [x, y, z] = vertex;
    // Gentle dimensional breathing lets the single solid transform over time.
    const morph = Math.sin(seconds * 0.24);
    x *= 1 + 0.12 * morph;
    y *= 1 - 0.09 * morph;
    z *= 1 + 0.08 * morph;
    const rx = 0.38 + seconds * 0.18;
    const ry = 0.5 + seconds * 0.27;
    const rz = seconds * 0.10;
    [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
    [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
    const size = Math.min(width, height) * 0.19;
    const perspective = 5 / (5 - z * 0.55);
    // The object drifts farther across its own canvas while staying within it.
    return [width * (0.5 + 0.11 * Math.sin(seconds * 0.21)) + x * size * perspective,
            height * (0.5 + 0.09 * Math.sin(seconds * 0.17 + 0.8)) + y * size * perspective, z];
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    const points = vertices.map(vertex => point(vertex, elapsed));
    context.lineWidth = 1.3;
    for (const [a, b] of edges) {
      const p = points[a], q = points[b];
      const depth = Math.max(0, Math.min(1, ((p[2] + q[2]) / 2 + 2) / 4));
      // Near edges are a little brighter, reinforcing the sense of depth.
      context.strokeStyle = `rgba(142, 222, 176, ${0.09 + depth * 0.19})`;
      context.beginPath();
      context.moveTo(p[0], p[1]);
      context.lineTo(q[0], q[1]);
      context.stroke();
    }
  }

  function tick(now) {
    frame = 0;
    if (document.hidden || !visible || preference.matches) return;
    if (!lastTime) lastTime = now;
    const interval = now - lastTime;
    // Thirty redraws per second keep the motion smooth without painting at
    // every screen refresh on high-refresh-rate displays.
    if (interval >= 33) {
      elapsed += Math.min(interval / 1000, 0.1);
      lastTime = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }

  function updateAnimation() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (!document.hidden && visible && !preference.matches) frame = requestAnimationFrame(tick);
    else if (preference.matches) draw();
  }

  document.addEventListener('visibilitychange', updateAnimation);
  if (preference.addEventListener) preference.addEventListener('change', updateAnimation);
  else if (preference.addListener) preference.addListener(updateAnimation);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      updateAnimation();
    }).observe(canvas);
  }
  resize();
  updateAnimation();
})();
