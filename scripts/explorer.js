/* Portfolio interactions, intentionally independent of the Matrix and cape.
   Each section below owns a small piece of state. No framework, remote AI,
   analytics, or workplace data is involved in these interactions. */
(() => {
  "use strict";

  // This tiny CSV has no quoted fields or embedded commas. Splitting is safe
  // for this controlled example, NOT a replacement for Python's csv parser.
  const SAMPLE_CSV = `ticket_id,subject,category,priority,status,resolution
SAMPLE-001,File share inaccessible,windows services,high,resolved,Restarted Workstation service and verified access
SAMPLE-002,File share inaccessible,windows services,medium,new,
SAMPLE-003,Printer offline,printing,low,closed,
SAMPLE-004,Outlook offline,email,medium,resolved,Disabled Work Offline and verified delivery
SAMPLE-005,Password expired,account access,medium,resolved,Reset password and verified sign-in
SAMPLE-006,VPN disconnects,network,,new,`;

  function readSample() {
    const [header, ...lines] = SAMPLE_CSV.split("\n");
    const fields = header.split(",");
    return lines.map(line => Object.fromEntries(fields.map((field, i) => [field, line.split(",")[i]])));
  }

  // Keep computation separate from the DOM so behavior can be tested directly.
  function analyze(records) {
    const seen = new Set();
    const valid = [], excluded = [];
    for (const row of records) {
      const required = ["ticket_id", "subject", "category", "priority", "status"];
      const missing = required.some(key => !String(row[key] ?? "").trim());
      const status = String(row.status ?? "").trim().toLowerCase();
      const priority = String(row.priority ?? "").trim().toLowerCase();
      const id = String(row.ticket_id ?? "").trim().toLowerCase();
      if (missing || !["new", "in progress", "resolved", "closed"].includes(status) ||
          !["low", "medium", "high", "critical"].includes(priority) || seen.has(id)) {
        excluded.push(row); continue;
      }
      seen.add(id);
      valid.push({ ...row, status });
    }
    const subjects = new Map();
    const categories = new Map();
    for (const row of valid) {
      const subject = row.subject.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().replace(/\s+/g, " ");
      subjects.set(subject, (subjects.get(subject) || 0) + 1);
      const category = row.category.trim().toLowerCase();
      categories.set(category, (categories.get(category) || 0) + 1);
    }
    return {
      valid, excluded, categories,
      missing: valid.filter(row => ["resolved", "closed"].includes(row.status) && !String(row.resolution ?? "").trim()),
      repeated: [...subjects].filter(([, count]) => count > 1)
    };
  }

  // Node can import only the pure functions for tests; browsers continue below.
  if (typeof module !== "undefined" && module.exports) module.exports = { readSample, analyze };
  if (typeof document === "undefined") return;

  // 1. Tabs: automatic activation with arrows, Home, and End. Only the active
  // tab is in the Tab sequence; all content remains readable without JS.
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(index, focus = false) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
    });
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    const panel = document.getElementById(tab.getAttribute("aria-controls"));
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    panel.tabIndex = 0;
    tab.addEventListener("click", () => selectTab(index));
    tab.addEventListener("keydown", event => {
      // Skip tabs hidden for the currently featured project.
      const visibleTabs = tabs.filter(item => !item.hidden);
      const current = visibleTabs.indexOf(tab);
      const target = { ArrowRight: (current + 1) % visibleTabs.length, ArrowLeft: (current + visibleTabs.length - 1) % visibleTabs.length, Home: 0, End: visibleTabs.length - 1 }[event.key];
      if (target !== undefined) { event.preventDefault(); selectTab(tabs.indexOf(visibleTabs[target]), true); }
    });
  });
  selectTab(1); // Open on the interactive process, like the approved mockup.
  document.getElementById("feature-tabs").hidden = false;

  // 2. The sample computes real results from six fictional records on click.
  // It never runs shell commands or changes the user's workstation.
  const steps = [...document.querySelectorAll("[data-step]")];
  const stepText = [
    "Read six fictional records from an embedded CSV sample. No workplace data is uploaded.",
    "Check IDs, required fields, priorities, and statuses. SAMPLE-006 has no priority and is excluded for review.",
    "Count categories, flag missing resolution notes, and group repeated wording. Similar wording does not establish a shared root cause.",
    "Summarize the valid records and keep excluded records visible for review. Explore the workflow to see its computed results."
  ];
  function selectStep(index) {
    steps.forEach((step, i) => step.setAttribute("aria-pressed", String(i === index)));
    document.getElementById("step-detail").textContent = stepText[index];
  }
  steps.forEach((step, index) => step.addEventListener("click", () => selectStep(index)));
  document.getElementById("workflow").hidden = false;
  const runButton = document.getElementById("run-sample");
  runButton.hidden = false;
  runButton.addEventListener("click", () => {
    const result = analyze(readSample());
    const output = document.getElementById("sample-result");
    output.replaceChildren(); // Running again replaces results instead of duplicating them.
    const stats = document.createElement("dl");
    stats.className = "evidence-stats sample-stats";
    for (const [label, count] of [["Valid tickets", result.valid.length], ["Excluded rows", result.excluded.length], ["Missing notes", result.missing.length], ["Repeated groups", result.repeated.length]]) {
      const item = document.createElement("div"), term = document.createElement("dt"), value = document.createElement("dd");
      term.textContent = label; value.textContent = count;
      item.append(term, value); stats.append(item);
    }
    output.append(stats);
    const list = document.createElement("ul");
    [
      `Excluded for review: ${result.excluded.map(row => row.ticket_id).join(", ")}.`,
      `Missing resolution notes: ${result.missing.map(row => row.ticket_id).join(", ")}.`,
      ...result.repeated.map(([subject, count]) => `Repeated wording: “${subject}” (${count} tickets).`)
    ].forEach(text => { const item = document.createElement("li"); item.textContent = text; list.append(item); });
    output.append(list);
    output.hidden = false;
    selectStep(3);
    document.getElementById("sample-status").textContent = `Sample complete: ${result.valid.length} valid tickets, ${result.excluded.length} excluded, ${result.missing.length} missing notes, ${result.repeated.length} repeated group.`;
  });

  // 3. Filters use hidden, removing excluded cards from both layout and the
  // keyboard order. The count is announced without moving the visitor's focus.
  const cards = [...document.querySelectorAll("[data-technologies]")];
  const filters = [...document.querySelectorAll("[data-filter]")];
  const topic = document.getElementById("workbench-topic");
  const cases = document.getElementById("projects");
  const featured = document.getElementById("featured");
  const phone = window.matchMedia("(max-width: 620px)");
  const carousel = document.getElementById("case-carousel");
  const previous = document.getElementById("case-previous");
  const next = document.getElementById("case-next");
  const caseNavigation = document.getElementById("case-navigation");
  let visibleCards = cards;
  const reducedCaseMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scrollTolerance = 2;

  filters.forEach(button => {
    const option = document.createElement("option");
    option.value = button.dataset.filter;
    option.textContent = option.value === "all" ? "All topics" : button.textContent;
    topic.append(option);
  });

  function caseScrollEnd() {
    return carousel.scrollWidth - carousel.clientWidth;
  }
  function updateCaseArrows() {
    // Base the arrow states on scroll distance because several cards can be
    // visible at the end. aria-disabled keeps keyboard focus on the arrow.
    previous.setAttribute("aria-disabled", String(carousel.scrollLeft <= scrollTolerance));
    next.setAttribute("aria-disabled", String(carousel.scrollLeft >= caseScrollEnd() - scrollTolerance));
  }
  function cardOffset(card) {
    return card.getBoundingClientRect().left - carousel.getBoundingClientRect().left + carousel.scrollLeft;
  }
  function scrollCases(direction) {
    // Measure the live rail so an arrow also works after a swipe or resize.
    const left = carousel.scrollLeft;
    const end = caseScrollEnd();
    if (direction < 0 ? left <= scrollTolerance : left >= end - scrollTolerance) return;
    const offsets = visibleCards.map(cardOffset);
    const target = direction < 0
      ? offsets.reverse().find(offset => offset < left - scrollTolerance) ?? 0
      : offsets.find(offset => offset > left + scrollTolerance) ?? end;
    carousel.scrollTo({ left: target, behavior: reducedCaseMotion.matches ? "instant" : "smooth" });
    updateCaseArrows();
  }
  function filterProjects(technology) {
    visibleCards = cards.filter(card => technology === "all" || card.dataset.technologies.split(" ").includes(technology));
    cards.forEach(card => { card.hidden = !visibleCards.includes(card); });
    carousel.classList.toggle("case-single", visibleCards.length === 1);
    carousel.scrollTo({ left: 0, behavior: "instant" });
    updateCaseArrows();
    filters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === technology)));
    topic.value = technology;
    document.getElementById("filter-status").textContent = `${visibleCards.length} project${visibleCards.length === 1 ? "" : "s"}`;
  }
  previous.addEventListener("click", () => scrollCases(-1));
  next.addEventListener("click", () => scrollCases(1));
  caseNavigation.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    scrollCases(event.key === "ArrowRight" ? 1 : -1);
  });
  // Native overflow handles touch and trackpad gestures independently of Featured.
  carousel.addEventListener("scroll", updateCaseArrows, { passive: true });
  if ("ResizeObserver" in window) {
    new ResizeObserver(updateCaseArrows).observe(carousel);
  } else {
    window.addEventListener("resize", updateCaseArrows);
  }

  function showCase(card) {
    carousel.scrollTo({ left: cardOffset(card), behavior: "instant" });
    updateCaseArrows();
  }
  // Direct links and search results must reveal the requested hidden card.
  function revealHash() {
    // Preserve previously shared links to the former security project entry.
    const id = location.hash === "#project-security" ? "project-security-case" : location.hash.slice(1);
    const card = cards.find(item => item.id === id);
    if (!card) return;
    filterProjects("all");
    showCase(card);
    card.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  window.addEventListener("hashchange", revealHash);
  carousel.classList.add("case-carousel");
  caseNavigation.hidden = false;
  filterProjects("all");
  revealHash();
  filters.forEach(button => button.addEventListener("click", () => {
    if (button.getAttribute("aria-pressed") === "false") filterProjects(button.dataset.filter);
  }));
  topic.addEventListener("change", () => filterProjects(topic.value));
  document.getElementById("project-toolbar").hidden = false;

  document.getElementById("workbench-back").addEventListener("click", event => {
    event.preventDefault();
    const card = visibleCards.find(item => item.querySelector("[data-feature-select]")?.dataset.featureSelect === featured.dataset.project);
    if (card) showCase(card);
    const clearance = parseFloat(getComputedStyle(cases).scrollMarginTop);
    window.scrollTo({
      top: window.scrollY + cases.getBoundingClientRect().top - clearance,
      behavior: reducedCaseMotion.matches ? "instant" : "smooth"
    });
    (card?.querySelector("[data-feature-select]") || topic).focus({ preventScroll: true });
  });

  // 4. Search indexes existing headings and project tags rather than inventing
  // descriptions. textContent prevents a query from being interpreted as HTML.
  const dialog = document.getElementById("project-search");
  const trigger = document.getElementById("search-trigger");
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  const entries = cards.map(card => ({ title: card.querySelector("h3").textContent, detail: [...card.querySelectorAll(".tags li")].map(tag => tag.textContent).join(" / "), id: card.id }));
  // Index these homepage sections, so visitors can use search to reach
  // Articles and Tools just as they can reach Profile and Contact.
  entries.push(...["about", "contact", "articles", "tools"].map(id => ({ title: document.querySelector(`#${id} h2`).textContent.replace(/\s+/g, " ").trim(), detail: id, id })));
  let returnFocus;
  function closeSearch() { dialog.close(); }
  function renderSearch() {
    const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = entries.filter(entry => terms.every(term => `${entry.title} ${entry.detail}`.toLowerCase().includes(term)));
    results.replaceChildren();
    for (const entry of matches) {
      const item = document.createElement("li"), link = document.createElement("a"), title = document.createElement("strong"), detail = document.createElement("span");
      link.href = `#${entry.id}`; title.textContent = entry.title; detail.textContent = entry.detail;
      link.append(title, detail); item.append(link); results.append(item);
      link.addEventListener("click", () => {
        filterProjects("all"); // A filtered-out project must become reachable.
        setMenu(false);
        const destination = document.getElementById(entry.id);
        if (cards.includes(destination)) showCase(destination);
        if (!destination.hasAttribute("tabindex")) destination.tabIndex = -1;
        // The dialog's asynchronous close event must not steal focus back
        // from the project the visitor chose.
        returnFocus = destination;
        closeSearch();
        // Keep native anchor navigation: it updates history and moves focus
        // to this tabindex-enabled destination after closing the dialog.
      });
    }
    document.getElementById("search-status").textContent = matches.length ? `${matches.length} ${matches.length === 1 ? "result" : "results"}` : "No matches. Try Python, JavaScript, or cybersecurity.";
  }
  function openSearch() {
    if (document.body.dataset.side === "creative" || dialog.open) return;
    returnFocus = document.activeElement;
    input.value = ""; renderSearch(); dialog.showModal(); input.focus();
  }
  if (typeof dialog.showModal === "function") {
    trigger.hidden = false;
    trigger.addEventListener("click", openSearch);
    document.getElementById("search-close").addEventListener("click", closeSearch);
    dialog.addEventListener("close", () => {
      // Let the native modal restore its state first, then choose our target.
      const target = returnFocus;
      requestAnimationFrame(() => { if (target?.isConnected) target.focus({ preventScroll: true }); });
    });
    dialog.addEventListener("click", event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) closeSearch();
    });
    input.addEventListener("input", renderSearch);
    dialog.addEventListener("keydown", event => {
      const links = [...results.querySelectorAll("a")];
      if (!links.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const index = links.indexOf(document.activeElement);
        const next = index < 0 ? (event.key === "ArrowDown" ? 0 : links.length - 1) : (index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
        links[next].focus();
      } else if (event.key === "Enter" && document.activeElement === input) { event.preventDefault(); links[0].click(); }
    });
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && document.body.dataset.side !== "creative") { event.preventDefault(); if (dialog.open) closeSearch(); else openSearch(); }
    });
    trigger.querySelector("kbd").textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K";
  }

  // 5. A scroll-position rail is a secondary navigation aid on wide screens.
  // IntersectionObserver avoids constantly calculating positions on scroll.
  const rail = document.getElementById("section-rail");
  const railLinks = [...rail.querySelectorAll("a")];
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(items => {
      items.forEach(item => {
        if (!item.isIntersecting) return;
        railLinks.forEach(link => {
          if (link.hash === `#${item.target.id}`) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-10% 0px -55% 0px", threshold: 0 });
    railLinks.forEach(link => observer.observe(document.querySelector(link.hash)));
    rail.hidden = false;
  }

  // Keep the same controls and case-file order for touch and keyboard users.
  const menu = document.getElementById("workbench-menu");
  const header = menu.closest("header");
  const caseNote = cases.querySelector("[data-decode]");
  const mobileMotion = document.getElementById("workbench-motion");
  const matrixToggle = document.getElementById("matrix-toggle");
  function setMenu(open) { menu.setAttribute("aria-expanded", String(open)); }
  menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") === "false"));
  document.getElementById("professional-nav").addEventListener("click", event => {
    if (event.target.closest("a")) setMenu(false);
  });
  window.addEventListener("hashchange", () => setMenu(false));
  header.addEventListener("keydown", event => {
    if (event.key !== "Escape" || menu.getAttribute("aria-expanded") !== "true") return;
    setMenu(false);
    menu.focus();
  });
  header.addEventListener("focusout", event => {
    const destination = event.relatedTarget;
    if (destination && !header.contains(destination) && !dialog.contains(destination)) setMenu(false);
  });
  document.addEventListener("click", event => {
    if (event.isTrusted && !header.contains(event.target) && !dialog.contains(event.target)) setMenu(false);
  });
  function syncMotion() {
    mobileMotion.hidden = matrixToggle.hidden || matrixToggle.disabled;
    mobileMotion.textContent = matrixToggle.textContent;
    mobileMotion.setAttribute("aria-pressed", matrixToggle.getAttribute("aria-pressed"));
  }
  mobileMotion.addEventListener("click", () => matrixToggle.click());
  new MutationObserver(syncMotion).observe(matrixToggle, { attributes: true, attributeFilter: ["aria-pressed", "disabled", "hidden"] });
  syncMotion();

  function syncPhoneLayout() {
    const showMenu = phone.matches && document.body.dataset.side !== "creative";
    menu.hidden = !showMenu;
    if (!showMenu) setMenu(false);
    caseNote.setAttribute("aria-label", phone.matches ? `Case Files. ${caseNote.dataset.decode}` : caseNote.dataset.decode);

    const before = phone.matches ? cases : featured;
    const after = phone.matches ? featured : cases;
    if (before.nextElementSibling === after) return;
    const focused = document.activeElement;
    // Move the rail only. Reparenting Featured can restart its embedded game.
    if (phone.matches) featured.before(cases);
    else featured.after(cases);
    if (cases.contains(focused)) focused.focus({ preventScroll: true });
  }
  phone.addEventListener("change", syncPhoneLayout);
  function syncSide() {
    const creative = document.body.dataset.side === "creative";
    trigger.hidden = creative || typeof dialog.showModal !== "function";
    rail.hidden = creative || !("IntersectionObserver" in window);
    if (creative && dialog.open) closeSearch();
    syncPhoneLayout();
  }
  new MutationObserver(syncSide).observe(document.body, { attributes: true, attributeFilter: ["data-side"] });
  syncSide();
})();
