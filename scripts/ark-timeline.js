/* A small dated view of the same favorites used by the shuffled reel. */
(() => {
  function keyFor(item) { return item.category + "::" + item.title; }
  function displayName(item) { return item.title === "Halo 2 / Reach" ? "Halo" : item.title; }
  window.ARK_TIMELINE = {
    init(reel, select) {
      const container = document.getElementById("ark-timeline-items");
      const current = document.getElementById("ark-timeline-current");
      const back = document.getElementById("ark-timeline-back");
      const forward = document.getElementById("ark-timeline-forward");
      if (!container || !current || !back || !forward) return null;
      const years = window.ARK_YEARS || {};
      const dated = reel.map((item, index) => ({ item, index, detail: years[keyFor(item)] }))
        .filter(entry => entry.detail && Number.isInteger(entry.detail.year))
        .sort((a, b) => a.detail.year - b.detail.year || displayName(a.item).localeCompare(displayName(b.item)));
      const visibleCount = 3;
      let start = 0, selectedKey = "";

      function render() {
        container.replaceChildren();
        const entries = dated.slice(start, start + visibleCount);
        entries.forEach(entry => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "ark-timeline-item";
          button.setAttribute("aria-pressed", String(keyFor(entry.item) === selectedKey));
          const year = document.createElement("span");
          year.className = "ark-timeline-year";
          year.textContent = String(entry.detail.year);
          const name = document.createElement("span");
          name.className = "ark-timeline-name";
          name.textContent = displayName(entry.item) + " · " + entry.item.category;
          button.append(year, name);
          button.addEventListener("click", () => {
            select(entry.index);
            // Rendering replaces the buttons; restore focus after a manual choice.
            const active = container.querySelector('[aria-pressed="true"]');
            if (active) active.focus();
          });
          container.append(button);
        });
        back.disabled = start === 0;
        forward.disabled = start + visibleCount >= dated.length;
      }
      back.addEventListener("click", () => { start = Math.max(0, start - 1); render(); });
      forward.addEventListener("click", () => { start = Math.min(Math.max(0, dated.length - visibleCount), start + 1); render(); });
      return {
        show(item) {
          selectedKey = keyFor(item);
          const at = dated.findIndex(entry => keyFor(entry.item) === selectedKey);
          if (at < 0) {
            current.textContent = "Release year to confirm";
          } else {
            const detail = dated[at].detail;
            current.textContent = detail.year + (detail.label ? " · " + detail.label : "");
            start = Math.max(0, Math.min(Math.max(0, dated.length - visibleCount), at - 1));
          }
          render();
        }
      };
    }
  };
})();
