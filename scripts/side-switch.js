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

  // 3. Keep the effects in one bounded sequence. Retaining animations until
  // cleanup prevents a flash between stages. Only visual layers animate;
  // no screenshots, remote services, or page-content duplication are needed.
  const effects = [];
  async function animate(element, frames, duration, easing = "ease-out") {
    const effect = element.animate(frames, { duration, easing, fill: "forwards" });
    effects.push(effect);
    await effect.finished;
  }

  // Decode early: the first transition should be as reliable as later ones.
  const idleArt = document.querySelector(".robot-idle");
  const firingArt = document.querySelector(".robot-firing");
  const artworkReady = Promise.all([idleArt, firingArt].filter(Boolean).map(image =>
    typeof image.decode === "function" ? image.decode().catch(() => null) : null
  ));

  async function pose(braced, duration) {
    if (!idleArt || !firingArt) return;
    await Promise.all([
      animate(idleArt, [{ opacity: braced ? 1 : 0 }, { opacity: braced ? 0 : 1 }], duration, "ease-in-out"),
      animate(firingArt, [{ opacity: braced ? 0 : 1 }, { opacity: braced ? 1 : 0 }], duration, "ease-in-out")
    ]);
  }

  async function heatBlast(nextCreative) {
    await artworkReady;
    // Both controls can be activated after scrolling; bring the actor into view.
    window.scrollTo({ top: 0, behavior: "instant" });
    // A failed download must not fade the working idle artwork away.
    if (firingArt && (!firingArt.complete || !firingArt.naturalWidth)) {
      showSide(nextCreative);
      return;
    }
    await pose(true, 260);
    const eye = document.querySelector(".robot-eyes") || companion || button;
    const rect = eye.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth, rect.left + rect.width / 2));
    const y = Math.max(0, Math.min(innerHeight, rect.top + rect.height / 2 + 1));
    // Pixel coordinates remain aligned with the actual eye at any screen size.
    curtain.style.setProperty("--eye-x", `${x}px`);
    curtain.style.setProperty("--eye-y", `${y}px`);
    curtain.dataset.destination = nextCreative ? "creative" : "professional";
    document.body.dataset.transition = curtain.dataset.destination;
    const charge = curtain.querySelector(".eye-charge");
    const beam = curtain.querySelector(".eye-beam");
    const wash = curtain.querySelector(".heat-wash");
    const particles = curtain.querySelector(".heat-particles");
    curtain.hidden = false;

    // Anticipation: one steady build in brightness, then a fine horizontal beam.
    await animate(charge, [{ opacity: 0, transform: "scale(.4)" }, { opacity: .9, transform: "scale(1)" }], 260);
    await animate(beam, [{ opacity: 0, transform: "scaleX(0)" }, { opacity: .95, transform: "scaleX(1)" }], 240, "cubic-bezier(.2,.6,.3,1)");
    // The dark, opaque heat wave expands from the eye and conceals the swap.
    // Its radius reaches every corner, even in tall portrait viewports.
    const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 20;
    await Promise.all([
      animate(wash, [
        { opacity: 1, clipPath: `circle(0px at ${x}px ${y}px)` },
        { opacity: 1, clipPath: `circle(${radius}px at ${x}px ${y}px)` }
      ], 480, "cubic-bezier(.4,0,.2,1)"),
      animate(particles, [{ opacity: 0, transform: "translateX(-20px)" }, { opacity: .8, offset: .35 }, { opacity: 0, transform: "translateX(70px)" }], 480),
      animate(beam, [{ opacity: .95 }, { opacity: 0 }], 440),
      animate(charge, [{ opacity: .9 }, { opacity: 0 }], 300)
    ]);
    showSide(nextCreative);
    await animate(wash, [{ opacity: 1 }, { opacity: 0 }], 300, "ease-in-out");
    // Let the visitor see the robot settle back into its idle silhouette.
    await pose(false, 320);
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
        await heatBlast(nextCreative);
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
      effects.splice(0).forEach(effect => effect.cancel());
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
