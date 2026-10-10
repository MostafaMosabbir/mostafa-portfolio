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

    // The label always names the destination of the next click.
    label.textContent = isCreative
      ? "Professional side"
      : "Creative side";

    document.title = isCreative
      ? "Mostafa Mosabbir | Creative"
      : "Mostafa Mosabbir | IT & AI Automation";

    status.textContent = isCreative
      ? "Creative side opened."
      : "Professional side opened.";

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

  // 3. The whole cape sweeps across the viewport while CSS flutters its
  // fabric edge and folds. The center position fully covers the page.
  // direction reverses travel when returning to the professional side.
  async function sweep(entering, direction) {
    const frames = entering ? [
      { transform: "translateX(" + (-direction * 125) + "%) rotate(" + (-direction * 7) + "deg) skewY(-3deg)" },
      { transform: "translateX(" + (-direction * 42) + "%) rotate(" + (direction * 3) + "deg) skewY(2deg)", offset: .65 },
      { transform: "translateX(0) rotate(0deg) skewY(0deg)" }
    ] : [
      { transform: "translateX(0) rotate(0deg) skewY(0deg)" },
      { transform: "translateX(" + (direction * 45) + "%) rotate(" + (-direction * 3) + "deg) skewY(-2deg)", offset: .45 },
      { transform: "translateX(" + (direction * 125) + "%) rotate(" + (direction * 7) + "deg) skewY(3deg)" }
    ];
    const animation = curtain.animate(frames, {
      duration: entering ? 760 : 900,
      easing: "cubic-bezier(.42, 0, .25, 1)",
      fill: "forwards"
    });
    try {
      await animation.finished;
    } finally {
      curtain.style.transform = frames[frames.length - 1].transform;
      animation.cancel();
    }
  }

  // 4. Run the transition when the button is clicked.
  button.addEventListener("click", async () => {
    // Prevent repeated clicks from starting overlapping animations.
    if (isSwitching) return;

    isSwitching = true;
    button.disabled = true;

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
        const direction = nextCreative ? 1 : -1;
        curtain.dataset.destination = nextCreative ? "creative" : "professional";
        curtain.style.transform = "translateX(" + (-direction * 125) + "%)";
        curtain.hidden = false;
        await sweep(true, direction);
        showSide(nextCreative);
        await sweep(false, direction);
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
      button.disabled = false;
      isSwitching = false;

      // Keep keyboard focus on the control the visitor just used.
      button.focus({ preventScroll: true });
    }
  });

  // 5. Reveal the button only after its click handler is ready.
  // If JavaScript is unavailable, the professional site still works.
  button.hidden = false;
})();