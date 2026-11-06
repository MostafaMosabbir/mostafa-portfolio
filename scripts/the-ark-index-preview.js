/* The Ark combines favorites from different media into one browsable reel. */
(() => {
  const catalog = window.ARK_CATALOG;
  const art = window.ARK_ART_SOURCES || {};
  const creative = document.getElementById("creative-view");
  const title = document.getElementById("ark-feature-title");
  const category = document.getElementById("ark-feature-category");
  const image = document.getElementById("ark-feature-image");
  const placeholder = document.getElementById("ark-feature-placeholder");
  const credit = document.getElementById("ark-feature-credit");
  const source = document.getElementById("ark-feature-source");
  const previous = document.getElementById("ark-previous");
  const next = document.getElementById("ark-next");
  const progress = document.getElementById("ark-progress-bar");
  const position = document.getElementById("ark-position");
  const reelContainer = document.getElementById("ark-reel");
  const featureInfo = document.getElementById("ark-feature-info");
  const playToggle = document.getElementById("ark-play-toggle");
  const motionStatus = document.getElementById("ark-motion-status");
  if (!Array.isArray(catalog) || !creative || !title || !category || !image || !placeholder || !credit || !source || !previous || !next || !progress || !position || !reelContainer || !featureInfo || !playToggle || !motionStatus) return;

  // These titles come from Mostafa's favorites list. Covers can be added later.
  const books = ["Enders Game", "Harry Potter Series", "Dune", "Halo: The Fall of Reach", "Song of Ice and Fire Series"]
    .map(name => ({ category: "Books", title: name, sourceCategory: "Books" }));
  const groups = ["Movies", "TV", "Games", "Music", "Books"];
  const queues = Object.fromEntries(groups.map(group => [group, []]));
  const seen = new Set();
  [...catalog, ...books].forEach(item => {
    if (!queues[item.category]) return;
    const key = item.category + "::" + item.title.trim().toLowerCase();
    if (!seen.has(key)) { seen.add(key); queues[item.category].push(item); }
  });

  // Shuffle each category, then mix categories into one order for this visit.
  // Keeping the order stable makes Previous return to the item just seen.
  for (const group of groups) {
    const queue = queues[group];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
  }
  const reel = [];
  let previousGroup = null;
  while (groups.some(group => queues[group].length)) {
    const available = groups.filter(group => queues[group].length && group !== previousGroup);
    const options = available.length ? available : groups.filter(group => queues[group].length);
    // Avoid a choice that would leave too many of one category to interleave.
    const viable = options.filter(chosen => {
      const remaining = Object.fromEntries(groups.map(group => [group, queues[group].length - (group === chosen ? 1 : 0)]));
      const total = groups.reduce((sum, group) => sum + remaining[group], 0);
      return groups.every(group => remaining[group] <= total - remaining[group] + (group === chosen ? 0 : 1));
    });
    const candidates = viable.length ? viable : options;
    const totalWeight = candidates.reduce((sum, group) => sum + queues[group].length, 0);
    let pick = Math.random() * totalWeight;
    let chosen = candidates[candidates.length - 1];
    for (const group of candidates) {
      pick -= queues[group].length;
      if (pick < 0) { chosen = group; break; }
    }
    reel.push(queues[chosen].pop());
    previousGroup = chosen;
  }
  if (!reel.length) return;
  let selected = 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false;
  let advanceTimer = null;
  let fadeTimer = null;
  // Older browsers retain working playback when visibility observation is unavailable.
  let inView = typeof IntersectionObserver === "undefined";

  // Automatic movement runs only while this section and browser tab are visible.
  function stopTimers() {
    clearTimeout(advanceTimer);
    clearTimeout(fadeTimer);
    advanceTimer = fadeTimer = null;
    reelContainer.classList.remove("is-changing");
  }
  function updateMotionControl() {
    playToggle.hidden = reducedMotion.matches;
    playToggle.textContent = paused ? "Resume reel" : "Pause reel";
    playToggle.setAttribute("aria-pressed", String(paused));
    motionStatus.textContent = reducedMotion.matches ? "Automatic rotation is off for reduced motion." : (paused ? "Reel paused." : "");
  }
  function scheduleAdvance() {
    clearTimeout(advanceTimer);
    advanceTimer = null;
    if (paused || reducedMotion.matches || creative.hidden || document.hidden || !inView) return;
    advanceTimer = setTimeout(() => {
      // Automatic changes should not repeatedly interrupt a screen reader.
      featureInfo.setAttribute("aria-live", "off");
      reelContainer.classList.add("is-changing");
      fadeTimer = setTimeout(() => {
        selected = (selected + 1) % reel.length;
        showSelection();
        reelContainer.classList.remove("is-changing");
        fadeTimer = null;
        scheduleAdvance();
      }, 250);
    }, 8000);
  }
  function moveManually(direction) {
    paused = true;
    stopTimers();
    selected = (selected + direction + reel.length) % reel.length;
    // User-requested changes are announced so keyboard users get feedback.
    featureInfo.setAttribute("aria-live", "polite");
    showSelection();
    updateMotionControl();
  }

  function showSelection() {
    const item = reel[selected];
    const artwork = art[item.category + "::" + item.title];
    title.textContent = item.title === "Halo 2 / Reach" ? "Halo" : item.title;
    category.textContent = item.title === "Halo 2 / Reach" ? "Game series" : item.category;
    position.textContent = (selected + 1) + " / " + reel.length;
    progress.style.width = ((selected + 1) / reel.length * 100) + "%";
    source.hidden = true;
    source.removeAttribute("href");
    credit.textContent = "";
    if (!artwork || !artwork.url) {
      image.hidden = true;
      image.removeAttribute("src");
      placeholder.hidden = false;
      placeholder.textContent = "Artwork is not available for this title yet.";
      if (artwork && artwork.source) {
        source.href = artwork.source;
        source.hidden = false;
      }
      return;
    }
    credit.textContent = artwork.label;
    source.href = artwork.source;
    source.hidden = false;
    image.alt = artwork.label;
    if (creative.hidden) return; // Do not fetch images while The Workbench is open.
    const sameImage = image.getAttribute("src") === artwork.url;
    if (sameImage && image.complete && image.naturalWidth > 0) {
      image.hidden = false;
      placeholder.hidden = true;
      return;
    }
    image.hidden = true;
    placeholder.hidden = false;
    placeholder.textContent = "Loading artwork…";
    if (!sameImage) image.src = artwork.url;
  }
  image.addEventListener("load", () => {
    const item = reel[selected];
    const artwork = art[item.category + "::" + item.title];
    if (artwork && image.getAttribute("src") === artwork.url && !creative.hidden) {
      image.hidden = false;
      placeholder.hidden = true;
    }
  });
  image.addEventListener("error", () => {
    if (!image.hasAttribute("src")) return;
    image.hidden = true;
    placeholder.hidden = false;
    placeholder.textContent = "Artwork could not be loaded. Open the official source below.";
  });
  previous.addEventListener("click", () => moveManually(-1));
  next.addEventListener("click", () => moveManually(1));
  playToggle.addEventListener("click", () => {
    paused = !paused;
    stopTimers();
    updateMotionControl();
    scheduleAdvance();
  });
  document.addEventListener("visibilitychange", () => { stopTimers(); scheduleAdvance(); });
  reducedMotion.addEventListener("change", () => { stopTimers(); updateMotionControl(); scheduleAdvance(); });
  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(entries => {
      const entry = entries.find(item => item.target === reelContainer);
      if (!entry) return;
      inView = entry.isIntersecting;
      stopTimers();
      scheduleAdvance();
    }, { threshold: 0.01 }).observe(reelContainer);
  }
  new MutationObserver(() => {
    stopTimers();
    if (!creative.hidden) { showSelection(); scheduleAdvance(); }
  }).observe(creative, { attributes: true, attributeFilter: ["hidden"] });
  updateMotionControl();
  showSelection();
})();
