/*
  HTML holds the content.
  CSS controls the appearance.
  This JavaScript controls switching between the two sides.

  No additional libraries or installations are required.
*/

(() => {
  "use strict";

  // 1. Find the HTML elements using their IDs.
  const button = document.getElementById("side-switch");
  const companion = document.getElementById("pixel-switch");
  const controls = [button, companion].filter(Boolean);
  const label = document.getElementById("switch-label");
  const professional = document.getElementById("professional-view");
  const creative = document.getElementById("creative-view");
  const navigation = document.getElementById("professional-nav");
  const curtain = document.getElementById("burn-curtain");
  const status = document.getElementById("side-status");

  // Read the visitor's operating system/browser motion preference.
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  // State variables remember the current side and animation status.
  let isCreative = false;
  let isSwitching = false;

  // 2. Update everything associated with the selected side together.
  function showSide(nextCreative) {
    isCreative = nextCreative;

    // CSS reads this attribute to choose the correct color palette.
    document.body.dataset.side = isCreative
      ? "creative"
      : "professional";

    // hidden removes inactive content from layout and keyboard navigation.
    professional.hidden = isCreative;
    creative.hidden = !isCreative;
    navigation.hidden = isCreative;

    button.setAttribute("aria-pressed", String(isCreative));
    if (companion) companion.setAttribute("aria-label", isCreative ? "Open The Workbench" : "Open After Hours");

    // The label always names the destination of the next click.
    label.textContent = isCreative
      ? "The Workbench"
      : "After Hours";

    document.title = isCreative
      ? "Mostafa Mosabbir | After Hours"
      : "Mostafa Mosabbir | IT & AI Automation";

    status.textContent = isCreative
      ? "After Hours creative side opened."
      : "The Workbench opened.";

    // Clear a section anchor because its section may now be hidden.
    // replaceState does not add a new entry to the browser's Back history.
    if (window.location.hash) {
      try {
        history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      } catch {
        // Some browsers restrict history changes for local files.
        // The view still works if changing the address is unavailable.
      }
    }

    // Start each view at the top instead of keeping an old scroll position.
    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
  }

  // 3. Grow fabric from the companion, then let it billow off the right edge.
  // Every polygon has eight points so the browser can interpolate the shape.
  // At the midpoint the cape is a solid rectangle larger than the viewport.
  async function sweep(entering, origin) {
    const full = "polygon(0% 0%,50% 0%,100% 0%,100% 50%,100% 100%,50% 100%,0% 100%,0% 50%)";
    const flutter = "polygon(0% 0%,55% 5%,100% 0%,88% 45%,100% 96%,48% 88%,0% 100%,8% 50%)";
    const width = window.innerWidth * 1.2;
    const height = window.innerHeight * 1.2;
    const seed = `translate(${origin.x + window.innerWidth * .1}px, ${origin.y + window.innerHeight * .1}px) scale(${18 / width}, ${28 / height})`;
    const frames = entering ? [
      { transform: seed, clipPath: flutter },
      { transform: "translate(0,0) scale(1)", clipPath: flutter, offset: .8 },
      { transform: "translate(0,0) scale(1)", clipPath: full }
    ] : [
      { transform: "translate(0,0) scale(1)", clipPath: full },
      { transform: "translate(35%, -3%) skewY(-5deg)", clipPath: flutter, offset: .45 },
      { transform: "translate(115%, -8%) skewY(8deg)", clipPath: flutter }
    ];
    const animation = curtain.animate(frames, {
      duration: entering ? 680 : 720,
      easing: "cubic-bezier(.45, 0, .2, 1)", fill: "forwards"
    });
    try { await animation.finished; }
    finally {
      // Persist the final frame before removing the animation to avoid a flash.
      Object.assign(curtain.style, frames[frames.length - 1]);
      animation.cancel();
    }
  }

  // 4. Run the transition when the button is clicked.
  async function switchSide(event) {
    const trigger = event.currentTarget;
    // Prevent repeated clicks from starting overlapping animations.
    if (isSwitching) return;

    isSwitching = true;
    controls.forEach(control => { control.disabled = true; });

    const nextCreative = !isCreative;

    try {
      if (
        reducedMotion.matches ||
        typeof curtain.animate !== "function"
      ) {
        // Switch immediately when animation is unwanted or unsupported.
        showSide(nextCreative);
      } else {
        // Scarlet fabric opens creative mode; emerald fabric returns home.
        // Capture the visible sprite before switching layouts or scrolling.
        const rect = (companion || button).getBoundingClientRect();
        const origin = { x: Math.max(0, Math.min(innerWidth, rect.left + rect.width / 2)),
          y: Math.max(0, Math.min(innerHeight, rect.top + rect.height / 2)) };
        document.body.dataset.transition = nextCreative ? "creative" : "professional";
        curtain.dataset.destination = nextCreative ? "creative" : "professional";
        curtain.style.transform = "scale(0)";
        curtain.hidden = false;
        await sweep(true, origin);
        showSide(nextCreative);
        await sweep(false, origin);
      }
    } catch (error) {
      // An animation failure should not prevent access to either side.
      showSide(nextCreative);
      console.warn(
        "Animation skipped; the selected side is still available.",
        error
      );
    } finally {
      // Always clean up and make the button usable again.
      curtain.hidden = true;
      delete document.body.dataset.transition;
      controls.forEach(control => { control.disabled = false; });
      isSwitching = false;

      // Keep keyboard focus on the control the visitor just used.
      trigger.focus({ preventScroll: true });
    }
  }
  controls.forEach(control => control.addEventListener("click", switchSide));

  // 5. Reveal the button only after its click handler is ready.
  // If JavaScript is unavailable, the professional site still works.
  controls.forEach(control => { control.hidden = false; });
})();
