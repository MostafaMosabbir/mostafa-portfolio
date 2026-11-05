/* The data and the interface are separate so the collection is easy to update. */
(() => {
  const catalog = window.ARK_CATALOG;
  const lists = document.getElementById("ark-index-lists");
  const search = document.getElementById("ark-search");
  const status = document.getElementById("ark-search-status");
  const title = document.getElementById("ark-feature-title");
  const category = document.getElementById("ark-feature-category");
  const image = document.getElementById("ark-feature-image");
  const placeholder = document.getElementById("ark-feature-placeholder");
  const credit = document.getElementById("ark-feature-credit");
  const source = document.getElementById("ark-feature-source");
  const creative = document.getElementById("creative-view");
  if (!Array.isArray(catalog) || !lists || !search || !status || !title || !category || !image || !placeholder || !credit || !source || !creative) return;

  const art = window.ARK_ART_SOURCES || {};
  let selected = catalog.findIndex(item => item.title === "Halo 2 / Reach" && item.category === "Games");
  if (selected < 0) selected = 0;
  const selectionButtons = [];
  const sections = [];

  // Normalize accents and spacing so searches match familiar spellings.
  function normalize(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function updateLists() {
    const query = normalize(search.value);
    let matches = 0;
    for (const section of sections) {
      let groupMatches = 0;
      section.rows.forEach(({ row, item, index, position }) => {
        const match = !query || normalize(item.title).includes(query);
        if (query && match) { matches++; groupMatches++; }
        row.hidden = query ? !match : (!section.expanded && position >= 5 && index !== selected);
      });
      section.element.hidden = Boolean(query) && groupMatches === 0;
      if (section.more) {
        section.more.hidden = Boolean(query);
        section.more.setAttribute("aria-expanded", String(section.expanded));
        section.more.textContent = section.expanded ? "Show less" : "Show all (" + section.rows.length + ")";
      }
    }
    status.textContent = query ? matches + (matches === 1 ? " title found" : " titles found") : "";
  }

  function showSelection() {
    const item = catalog[selected];
    if (!item) return;
    const artwork = art[item.category + "::" + item.title];
    title.textContent = item.title;
    category.textContent = item.sourceCategory;
    selectionButtons.forEach(({ button, index }) => button.setAttribute("aria-pressed", String(index === selected)));
    updateLists();
    source.hidden = true;
    source.removeAttribute("href");
    credit.textContent = "";

    if (!artwork) {
      image.hidden = true;
      image.removeAttribute("src");
      placeholder.hidden = false;
      placeholder.textContent = "Artwork is not available for this title.";
      return;
    }
    credit.textContent = artwork.label;
    source.href = artwork.source;
    source.hidden = false;
    image.alt = artwork.label;

    // The professional side never starts an artwork request.
    if (creative.hidden) {
      image.hidden = true;
      placeholder.hidden = false;
      placeholder.textContent = "Artwork will appear when After Hours opens.";
      return;
    }
    // Reuse an already loaded image, avoiding a flash on return to After Hours.
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
    const item = catalog[selected];
    const artwork = item && art[item.category + "::" + item.title];
    if (artwork && image.getAttribute("src") === artwork.url && !creative.hidden) {
      image.hidden = false;
      placeholder.hidden = true;
    }
  });
  // A blocked image leaves the title and its official source link available.
  image.addEventListener("error", () => {
    if (!image.hasAttribute("src")) return;
    image.hidden = true;
    placeholder.textContent = "Artwork could not be loaded. Open the official source below.";
    placeholder.hidden = false;
  });

  lists.replaceChildren();
  for (const group of ["Movies", "TV", "Games", "Music"]) {
    const section = document.createElement("section");
    section.className = "ark-category";
    const heading = document.createElement("h3");
    heading.textContent = group;
    section.append(heading);
    const list = document.createElement("ul");
    list.id = "ark-list-" + group.toLowerCase();
    const seen = new Set();
    const entries = catalog.map((item, index) => ({ item, index }))
      .filter(entry => entry.item.category === group)
      .filter(entry => {
        const key = entry.item.title.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    const state = { element: section, rows: [], more: null, expanded: false };
    entries.forEach(({ item, index }, position) => {
      const row = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ark-entry";
      button.textContent = item.title;
      button.addEventListener("click", () => { selected = index; showSelection(); });
      selectionButtons.push({ button, index });
      state.rows.push({ row, item, index, position });
      row.append(button);
      list.append(row);
    });
    section.append(list);
    if (entries.length > 5) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "ark-more";
      more.setAttribute("aria-controls", list.id);
      more.addEventListener("click", () => { state.expanded = !state.expanded; updateLists(); });
      state.more = more;
      section.append(more);
    }
    sections.push(state);
    lists.append(section);
  }

  search.addEventListener("input", updateLists);
  search.disabled = false;
  // The side switch changes the hidden attribute when visitors enter After Hours.
  new MutationObserver(() => { if (!creative.hidden) showSelection(); }).observe(creative, { attributes: true, attributeFilter: ["hidden"] });
  showSelection();
})();
