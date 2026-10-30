/* Decorative translations fade without repeatedly announcing changes to
   screen readers. Click the greeting to pause or resume the rotation. */
(() => {
  "use strict";
  const host = document.getElementById("welcome-greeting");
  if (!host) return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const words = [["Halimoon", ""], ["Dreamer", "en"], ["Rêveur", "fr"], ["Soñador", "es"], ["Sognatore", "it"]];
  let timer, fade, index = 0, paused = false, button, word;
  function clear() { clearTimeout(timer); clearTimeout(fade); }
  function schedule() {
    clear();
    if (motion.matches || paused || document.hidden) return;
    timer = setTimeout(() => {
      // Wait until the opening sequence reveals the welcome sentence.
      if (document.getElementById("home")?.classList.contains("baseline-running")) { schedule(); return; }
      word.classList.add("is-fading");
      fade = setTimeout(() => {
        index = (index + 1) % words.length;
        word.textContent = words[index][0];
        word.lang = words[index][1];
        word.classList.remove("is-fading");
        schedule();
      }, 350);
    }, 4000);
  }
  function render() {
    clear();
    host.replaceChildren();
    if (motion.matches) { host.textContent = "Welcome!"; return; }
    index = 0;
    button = document.createElement("button");
    button.type = "button";
    button.className = "welcome-rotation";
    button.setAttribute("aria-label", "Welcome! Pause rotating greeting");
    button.setAttribute("aria-pressed", "false");
    button.title = "Pause rotating greeting";
    const visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");
    visual.append("Welcome, ");
    const slot = document.createElement("span");
    slot.className = "welcome-word-slot";
    // Invisible copies reserve the exact longest width in the current font.
    words.forEach(([text]) => {
      const size = document.createElement("span");
      size.className = "welcome-word-size";
      size.textContent = text;
      slot.append(size);
    });
    word = document.createElement("span");
    word.className = "welcome-word";
    word.textContent = words[0][0];
    slot.append(word);
    visual.append(slot, ".");
    button.append(visual);
    button.addEventListener("click", () => {
      paused = !paused;
      button.setAttribute("aria-pressed", String(paused));
      button.setAttribute("aria-label", paused ? "Welcome! Resume rotating greeting" : "Welcome! Pause rotating greeting");
      button.title = paused ? "Resume rotating greeting" : "Pause rotating greeting";
      word.classList.remove("is-fading");
      schedule();
    });
    host.append(button);
    paused = false;
    schedule();
  }
  motion.addEventListener("change", render);
  document.addEventListener("visibilitychange", () => { word?.classList.remove("is-fading"); schedule(); });
  render();
})();
