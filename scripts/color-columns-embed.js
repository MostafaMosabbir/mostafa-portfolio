/* The game loads only after a visitor asks to play. Removing the iframe ends
   its game loop rather than letting a hidden game consume resources. */
(() => {
  "use strict";
  const play = document.getElementById("columns-play");
  const close = document.getElementById("columns-close");
  const container = document.getElementById("columns-frame-container");
  const status = document.getElementById("columns-status");
  const feature = document.getElementById("featured");
  if (!play || !close || !container || !status || !feature) return;

  let frame = null;

  function endGame(restoreFocus, message) {
    if (!frame) return;
    frame.remove();
    frame = null;
    close.hidden = true;
    play.hidden = false;
    status.textContent = message;
    if (restoreFocus) play.focus();
  }

  function openGame() {
    if (frame) return;
    frame = document.createElement("iframe");
    frame.title = "Color Columns playable game";
    frame.className = "columns-game-frame";
    frame.src = "projects/color-columns/play/index.html";
    // Loading a document in an iframe cannot reliably report game startup
    // errors, so the game itself is responsible for showing its load status.
    container.appendChild(frame);
    play.hidden = true;
    close.hidden = false;
    status.textContent = "Game opened. Click inside the game for controls. Closing ends this session.";
  }

  play.addEventListener("click", openGame);
  close.addEventListener("click", () => endGame(true, "Game closed. The session has ended."));

  // A hidden iframe can keep running. Unload it when changing featured
  // projects or leaving Brief. The reset is explained next to the controls.
  document.querySelectorAll("[data-feature-select]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.featureSelect !== "columns") {
        endGame(false, "Game closed because the featured project changed.");
      }
    });
  });
  document.querySelectorAll("#feature-tabs [role=tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      if (tab.id !== "tab-overview") {
        endGame(false, "Game closed because you left the Brief tab.");
      }
    });
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && frame) endGame(true, "Game closed. The session has ended.");
    // The tabs also support arrow-key navigation. explorer.js updates the
    // selected panel before this bubbled event reaches document.
    const overview = document.getElementById("panel-overview");
    if (frame && overview && overview.hidden) {
      endGame(false, "Game closed because you left the Brief tab.");
    }
  });
  // Keyboard events do not bubble out of an iframe. The game may request an
  // exit by message; accept it only from our own frame and origin.
  window.addEventListener("message", event => {
    if (frame && event.origin === window.location.origin && event.source === frame.contentWindow &&
        event.data && event.data.type === "color-columns:exit") {
      endGame(true, "Game closed. The session has ended.");
    }
  });
  play.hidden = false;
})();
