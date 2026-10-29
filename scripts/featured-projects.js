/* Each project keeps its own DOM. Switching visibility preserves the ticket
   demo's results and listeners. Never insert HTML from a visitor or URL. */
(() => {
  "use strict";
  const projects = {
    portfolio: { number: "001", title: "Personal portfolio", badge: "Always Improving", meta: "HTML · CSS · JavaScript" },
    assistant: { number: "002", title: "IT Ticket Assistant", badge: "Working prototype", meta: "JavaScript · Rule-based matching · Local prototype" },
    analyzer: { number: "003", title: "Python IT Ticket Analyzer", badge: "Working prototype", meta: "Python · CSV · JavaScript demo" },
    security: { number: "004", title: "Security Proposal Workspace", badge: "Working prototype", meta: "Cybersecurity · Python · Selected NIST CSF 2.0 outcomes" }
  };
  const feature = document.getElementById("featured");
  if (!feature) return;
  const title = document.getElementById("featured-title");
  const buttons = [...document.querySelectorAll("[data-feature-select]")];
  const groups = [...feature.querySelectorAll("[data-feature-project]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function selectProject(key, moveFocus = false) {
    const project = projects[key];
    if (!project) return;
    groups.forEach(group => { group.hidden = group.dataset.featureProject !== key; });
    buttons.forEach(button => {
      const selected = button.dataset.featureSelect === key;
      button.setAttribute("aria-pressed", String(selected));
      if (button.classList.contains("feature-select")) button.textContent = selected ? "Featured above" : "Highlight project";
    });
    feature.dataset.project = key;
    title.textContent = project.title;
    document.getElementById("featured-number").textContent = `Project ${project.number} / Featured project`;
    document.getElementById("featured-badge").textContent = project.badge;
    document.getElementById("featured-meta").textContent = project.meta;
    document.getElementById("feature-tabs").setAttribute("aria-label", project.title);
    // Use the existing tab controller rather than creating a second tab state.
    if (moveFocus) {
      document.getElementById("tab-overview").click();
      document.getElementById("featured-status").textContent = `Project ${project.number}: ${project.title} is now featured.`;
      title.focus({ preventScroll: true });
      feature.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
    }
  }
  buttons.forEach(button => {
    button.addEventListener("click", () => selectProject(button.dataset.featureSelect, true));
    button.hidden = false;
  });
  document.getElementById("featured-picker").hidden = false;
  selectProject("analyzer");
})();
