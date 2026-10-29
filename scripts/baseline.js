/* Approved opening and section notes. All text is local and decorative:
   the intro does not connect to a service or perform security checks. */
(() => {
  "use strict";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("[data-decode]").forEach(button => {
    const phrase = button.dataset.decode;
    const output = button.querySelector(".decode-text");
    let timer = null, pinned = false, hovered = false;
    function reveal(open) {
      clearInterval(timer);
      button.classList.toggle("is-revealed", open);
      if (!open) { output.textContent = phrase.replace(/[^ ]/g, "·"); return; }
      if (reduced.matches) { output.textContent = phrase; return; }
      let step = 0;
      // The accessible name always contains the real phrase. Screen readers
      // never receive the changing decorative characters.
      const symbols = "01/.:_";
      timer = setInterval(() => {
        step++;
        const resolved = Math.ceil(step * phrase.length / 9);
        output.textContent = [...phrase].map((char, index) => index < resolved || char === " " ? char : symbols[(index + step) % symbols.length]).join("");
        if (step >= 9) { clearInterval(timer); output.textContent = phrase; }
      }, 65);
    }
    reveal(false);
    button.addEventListener("pointerenter", event => { if (event.pointerType === "mouse") { hovered = true; reveal(true); } });
    button.addEventListener("pointerleave", () => { hovered = false; if (!pinned && document.activeElement !== button) reveal(false); });
    button.addEventListener("focus", () => reveal(true));
    button.addEventListener("blur", () => { if (!pinned && !hovered) reveal(false); });
    button.addEventListener("click", () => { pinned = !pinned; button.setAttribute("aria-pressed", String(pinned)); reveal(pinned || hovered); });
    button.addEventListener("keydown", event => { if (event.key === "Escape") { pinned = false; button.setAttribute("aria-pressed", "false"); reveal(false); } });
    reduced.addEventListener("change", () => reveal(button.classList.contains("is-revealed")));
  });

  const intro = document.getElementById("baseline-intro");
  if (!intro) return;
  // Deep links take visitors directly to their destination. If storage is
  // unavailable, skip the intro instead of repeating it on every visit.
  const sessionKey = "mostafam-baseline-v1";
  try {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "seen");
  } catch { return; }
  if (reduced.matches || document.hidden || (location.hash && !["#home", "#main"].includes(location.hash))) return;

  const hero = document.getElementById("home");
  const copy = hero.querySelector(".hero-copy");
  const atmosphere = hero.querySelector(".hero-atmosphere");
  const skip = document.getElementById("baseline-skip");
  const lines = [...intro.querySelectorAll(".baseline-lines span")];
  const timers = new Set();
  let running = true;
  function later(callback, delay) {
    const id = setTimeout(() => { timers.delete(id); if (running) callback(); }, delay);
    timers.add(id);
  }
  function typeLine(line, text, duration) {
    line.textContent = "";
    line.classList.add("is-typing");
    [...text].forEach((character, index) => later(() => {
      line.textContent += character;
      if (index === text.length - 1) line.classList.remove("is-typing");
    }, (index + 1) * duration / text.length));
  }
  function finish() {
    if (!running) return;
    running = false;
    timers.forEach(clearTimeout); timers.clear();
    const returnFocus = document.activeElement === skip;
    intro.hidden = true;
    copy.inert = false; atmosphere.inert = false;
    hero.classList.remove("baseline-running");
    lines.forEach(line => line.classList.remove("is-typing"));
    if (!reduced.matches && typeof copy.animate === "function") {
      copy.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 220, easing: "ease-out" });
    }
    if (returnFocus) copy.querySelector("a").focus({ preventScroll: true });
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("hashchange", finish);
    reduced.removeEventListener("change", onMotion);
  }
  function onKey(event) { if (event.key === "Escape") finish(); }
  function onVisibility() { if (document.hidden) finish(); }
  function onMotion() { if (reduced.matches) finish(); }

  skip.addEventListener("click", finish);
  document.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("hashchange", finish);
  reduced.addEventListener("change", onMotion);
  // Finish before opening After Hours so the two animations never overlap.
  document.getElementById("pixel-switch")?.addEventListener("click", finish);
  document.getElementById("side-switch")?.addEventListener("click", finish);
  intro.hidden = false;
  hero.classList.add("baseline-running");
  copy.inert = true; atmosphere.inert = true;
  const duration = 4600;
  typeLine(lines[0], "And blood-black nothingness began to spin... A system of cells interlinked within cells interlinked within cells interlinked within one stem... And dreadfully distinct against the dark, a tall white fountain played.", duration * .51);
  later(() => {
    intro.dataset.phase = "ending";
    lines.forEach(line => { line.textContent = ""; });
    typeLine(lines[0], "Within cells interlinked.", duration * .08);
  }, duration * .59);
  later(() => typeLine(lines[1], "Within cells interlinked.", duration * .08), duration * .70);
  later(() => typeLine(lines[2], "Within cells interlinked.", duration * .08), duration * .81);
  later(finish, duration);
})();
