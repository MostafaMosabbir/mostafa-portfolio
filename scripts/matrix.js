/*
  MATRIX BACKGROUND
  Canvas paints fictional characters; it never reads files or system data.
  Edit SPEED and SPACING below to experiment with movement and density.
*/
(() => {
  "use strict";
  const canvas = document.getElementById("matrix-rain");
  const button = document.getElementById("matrix-toggle");
  if (!canvas || !button) return;
  const context = canvas.getContext("2d");
  if (!context) return; // A decorative effect must never prevent page access.

  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const phone = window.matchMedia("(max-width: 620px)");
  const SPEED = 24; // Approximate pixels per second, not pixels per frame.
  const SPACING = 22;
  const symbols = "01<>/{}[];:+=";
  // Streams have lengths 9 through 20. Prepare their tail colors once instead
  // of building a new color string for every character on every frame.
  const tailColors = Array.from({ length: 21 }, (_, length) =>
    Array.from({ length }, (_, index) => "rgba(67,157,107," + ((1 - index / length) * .8) + ")")
  );
  let width = 0;
  let height = 0;
  let resolution = 0;
  let streams = [];
  let animationId = null;
  let lastTime = 0;
  let manuallyPaused = false;
  let onScreen = true;

  // Limit backing resolution so a high-density screen does not create
  // an unnecessarily expensive canvas. CSS still controls the visible size.
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, phone.matches ? 1.25 : 2);
    const spacing = phone.matches ? 31 : SPACING;
    // ResizeObserver and window resize can report the same size. Avoid
    // resetting the canvas and randomizing every stream twice for one change.
    if (width === bounds.width && height === bounds.height && resolution === ratio) return;
    width = bounds.width;
    height = bounds.height;
    resolution = ratio;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    streams = Array.from({ length: Math.ceil(width / spacing) }, (_, i) => ({
      x: i * spacing,
      y: Math.random() * (height + 300) - 100,
      speed: SPEED * (.65 + Math.random() * .7),
      length: 9 + Math.floor(Math.random() * 12),
      seed: i * 17
    }));
    draw();
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    context.font = "12px Consolas, monospace";
    for (const stream of streams) {
      // Skip the invisible part of a stream without testing every character.
      const first = Math.max(0, Math.ceil((stream.y - height) / 16));
      const last = Math.min(stream.length - 1, Math.floor(stream.y / 16));
      const seed = stream.seed + Math.floor(stream.y / 32);
      for (let i = first; i <= last; i++) {
        const y = stream.y - i * 16;
        context.fillStyle = i === 0
          ? "rgba(146,225,179,.9)"
          : tailColors[stream.length][i];
        // A stable seed avoids flickering unrelated characters every frame.
        const index = (seed + i * 3) % symbols.length;
        context.fillText(symbols[index], stream.x, y);
      }
    }
  }

  function canRun() {
    return !preference.matches && !manuallyPaused && onScreen &&
      !document.hidden && document.body.dataset.side !== "creative";
  }

  function frame(time) {
    animationId = null;
    if (!canRun()) return;
    if (!lastTime) lastTime = time;
    const elapsed = time - lastTime;
    // The taller phone background needs fewer repaints and fewer columns.
    if (elapsed >= (phone.matches ? 50 : 33)) {
      const seconds = Math.min(elapsed / 1000, .1);
      for (const stream of streams) {
        stream.y += stream.speed * seconds;
        if (stream.y - stream.length * 16 > height) stream.y = -16;
      }
      draw();
      lastTime = time;
    }
    animationId = requestAnimationFrame(frame);
  }

  function sync() {
    const paused = manuallyPaused || preference.matches;
    button.textContent = preference.matches
      ? "Background paused · reduced motion"
      : manuallyPaused ? "Resume background" : "Pause background";
    button.setAttribute("aria-pressed", String(paused));
    button.disabled = preference.matches;
    if (canRun()) {
      if (animationId === null) {
        lastTime = 0;
        animationId = requestAnimationFrame(frame);
      }
    } else if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  button.addEventListener("click", () => {
    manuallyPaused = !manuallyPaused;
    sync();
  });
  preference.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("resize", resize);
  // Hidden creative/professional views change the canvas size as well.
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      onScreen = entries[0].isIntersecting;
      sync();
    }).observe(canvas);
  }
  new MutationObserver(() => { resize(); sync(); })
    .observe(document.body, { attributes: true, attributeFilter: ["data-side"] });

  resize();
  button.hidden = false;
  sync();
})();
