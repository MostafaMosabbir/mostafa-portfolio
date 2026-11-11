/* Each project keeps its own DOM. Switching visibility preserves the ticket
   demo's results and listeners. Never insert HTML from a visitor or URL. */
(() => {
  "use strict";
  const projects = {
    portfolio: { number: "001", title: "Personal portfolio", badge: "Always Improving", meta: "HTML · CSS · JavaScript" },
    assistant: { number: "002", title: "IT Ticket Assistant", badge: "Working prototype", meta: "JavaScript · Rule-based matching · Local prototype" },
    analyzer: { number: "003", title: "Python IT Ticket Analyzer", badge: "Working prototype", meta: "Python · CSV · JavaScript demo" },
    security: { number: "004", title: "Security Proposal Workspace", badge: "Working prototype", meta: "Cybersecurity · Python · Selected NIST CSF 2.0 outcomes" },
    // Project numbers are identifiers, not a count; Project 005 is still planned.
    columns: { number: "006", title: "Color Columns", badge: "Learning project", meta: "Rust · WebAssembly · Browser adaptation" },
    kev: { number: "007", title: "CISA Vulnerability Explorer", badge: "Working prototype", meta: "Cybersecurity · R · Public CISA data" },
    theater: { number: "009", title: "TheaterCorp", badge: "Learning project", meta: "Java · JavaScript browser demo" },
    algorithm: { number: "010", title: "Algorithm Explorer", badge: "Learning project", meta: "C++ · JavaScript browser demo" },
    assembly: { number: "011", title: "x86 Assembly Calculator", badge: "Class project adaptation", meta: "x86 Assembly · JavaScript browser simulation" },
    securebank: { number: "012", title: "SecureBank Network Defense Lab", badge: "Lab plan", meta: "Cybersecurity · Packet Tracer · Fictional bank network" },
    office: { number: "013", title: "Office IT Buildout", badge: "Case study", meta: "IT Operations · Office relocation · Readiness testing" },
    "zoom-phone": { number: "014", title: "Zoom Phone Migration", badge: "Case study", meta: "IT Operations · Phone migration · Business continuity" }
  };
  const feature = document.getElementById("featured");
  if (!feature) return;
  const title = document.getElementById("featured-title");
  const buttons = [...document.querySelectorAll("[data-feature-select]")];
  const groups = [...feature.querySelectorAll("[data-feature-project]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const phone = document.getElementById("workbench-back") && window.matchMedia("(max-width: 620px)");

  function labelButtons() {
    buttons.forEach(button => {
      const selected = button.dataset.featureSelect === feature.dataset.project;
      button.setAttribute("aria-pressed", String(selected));
      button.textContent = selected ? (phone?.matches ? "View Featured" : "Featured above") : "Highlight project";
      button.setAttribute("aria-label", `${button.textContent}, ${projects[button.dataset.featureSelect].title}`);
    });
  }

  function openFeatured(key, resetTab = true) {
    if (resetTab) {
      let tab = "tab-overview";
      if (phone?.matches) {
        if (key === "analyzer" || key === "security") tab = "tab-process";
        if (key === "kev") tab = "tab-evidence";
      }
      document.getElementById(tab).click();
    }
    const project = projects[key];
    document.getElementById("featured-status").textContent = `Project ${project.number}: ${project.title} is now featured.`;
    title.focus({ preventScroll: true });
    const behavior = reducedMotion.matches ? "instant" : "smooth";
    if (phone?.matches) {
      const clearance = parseFloat(getComputedStyle(feature).scrollMarginTop);
      window.scrollTo({ top: window.scrollY + feature.getBoundingClientRect().top - clearance, behavior });
    } else {
      feature.scrollIntoView({ behavior, block: "start" });
    }
  }

  function selectProject(key, moveFocus = false) {
    const project = projects[key];
    if (!project) return;
    if (key === feature.dataset.project) {
      if (moveFocus && phone?.matches) openFeatured(key, false);
      return;
    }
    groups.forEach(group => { group.hidden = group.dataset.featureProject !== key; });
    feature.dataset.project = key;
    labelButtons();
    // Project switches return to Brief, so a hidden tab never remains selected.
    document.getElementById("tab-articles").hidden = !["security", "columns", "kev", "securebank"].includes(key);
    document.getElementById("tab-what-changed").hidden = !["algorithm", "securebank"].includes(key);
    title.textContent = project.title;
    document.getElementById("featured-number").textContent = `Project ${project.number} / Featured project`;
    document.getElementById("featured-badge").textContent = project.badge;
    document.getElementById("featured-meta").textContent = project.meta;
    document.getElementById("feature-tabs").setAttribute("aria-label", project.title);
    if (moveFocus) openFeatured(key);
  }
  buttons.forEach(button => {
    button.addEventListener("click", () => selectProject(button.dataset.featureSelect, true));
    button.hidden = false;
  });
  selectProject("analyzer");
  phone?.addEventListener("change", labelButtons);
})();
