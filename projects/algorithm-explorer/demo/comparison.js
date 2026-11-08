(() => {
  "use strict";

  const sample = Object.freeze([2, 4, 7, 7, 11, 15, 19, 23]);
  const examples = new Set([23, 2, 7, 10]);

  function linearTrace(values, target) {
    const probes = [];
    let foundIndex = null;
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      const matched = value === target;
      if (matched) foundIndex = index;
      const next = index + 1 < values.length ? "Move to the next index." : "No values remain.";
      probes.push({
        index, value, matched, low: index, high: values.length - 1, foundIndex,
        detail: matched ? `${value} matches. Stop at the first match.` : `${value} differs from ${target}. ${next}`
      });
      if (matched) break;
    }
    return { probes, foundIndex };
  }

  function binaryTrace(values, target) {
    const probes = [];
    let low = 0;
    let high = values.length - 1;
    let foundIndex = null;
    // Inclusive bounds match the C++ version. The high bound can fall below zero.
    while (low <= high) {
      const index = low + Math.floor((high - low) / 2);
      const value = values[index];
      const matched = value === target;
      const windowLow = low;
      const windowHigh = high;
      let detail;
      if (value < target) {
        low = index + 1;
        detail = `${value} is below ${target}. Keep the right side.`;
      } else {
        high = index - 1;
        if (matched) {
          // Keep this candidate and continue on the left to find the first match.
          foundIndex = index;
          detail = high >= low
            ? `${value} matches. Check to the left for an earlier match.`
            : `${value} matches. No earlier positions remain in the window.`;
        } else {
          detail = `${value} is above ${target}. Keep the left side.`;
        }
      }
      probes.push({ index, value, matched, low: windowLow, high: windowHigh, foundIndex, detail });
    }
    return { probes, foundIndex };
  }

  function mountComparison(root) {
    if (!root) return;
    const example = root.querySelector("[data-example]");
    const previous = root.querySelector("[data-previous]");
    const next = root.querySelector("[data-next]");
    const finish = root.querySelector("[data-finish]");
    const positionText = root.querySelector("[data-position]");
    const live = root.querySelector("[data-live]");
    const lanes = [
      { key: "linear", name: "Linear search", trace: linearTrace },
      { key: "binary", name: "Binary search", trace: binaryTrace }
    ].map(lane => {
      const element = root.querySelector(`[data-lane="${lane.key}"]`);
      const array = element.querySelector("[data-array]");
      const cells = sample.map((value, index) => {
        const cell = root.ownerDocument.createElement("li");
        const label = root.ownerDocument.createElement("span");
        cell.className = "algorithm-compare-cell";
        label.className = "algorithm-compare-index";
        label.textContent = index;
        cell.append(String(value), label);
        return cell;
      });
      array.replaceChildren(...cells);
      return {
        ...lane, cells,
        count: element.querySelector("[data-count]"),
        detail: element.querySelector("[data-detail]"),
        result: element.querySelector("[data-result]")
      };
    });
    let position;
    let last;

    function render() {
      const messages = lanes.map(lane => {
        // When the shorter search finishes, retain its final probe while the other lane advances.
        const count = Math.min(position, lane.probes.length);
        const probe = lane.probes[count - 1];
        const complete = count === lane.probes.length;
        const probeLabel = `${count} probe${count === 1 ? "" : "s"}`;
        let result = probe.foundIndex === null ? "Searching" : `Candidate at index ${probe.foundIndex}`;
        if (complete) result = probe.foundIndex === null ? "Not found" : `First match at index ${probe.foundIndex}`;
        lane.count.textContent = probeLabel;
        const windowText = lane.key === "binary" ? `Window ${probe.low} to ${probe.high}. ` : "";
        lane.detail.textContent = `${windowText}Index ${probe.index}. ${probe.detail}`;
        lane.result.textContent = result;
        lane.cells.forEach((cell, index) => {
          const current = index === probe.index;
          const outside = index < probe.low || index > probe.high;
          cell.dataset.probe = String(current);
          cell.dataset.outside = String(outside);
          const status = current ? ", current probe" : outside ? ", outside this search window" : "";
          cell.setAttribute("aria-label", `Index ${index}, value ${sample[index]}${status}`);
        });
        return `${lane.name}: ${probeLabel}. ${result}.`;
      });
      previous.setAttribute("aria-disabled", String(position === 1));
      next.setAttribute("aria-disabled", String(position === last));
      finish.setAttribute("aria-disabled", String(position === last));
      positionText.textContent = `Step ${position} of ${last}`;
      live.textContent = messages.join(" ");
    }

    function selectExample() {
      const selected = Number(example.value);
      const target = examples.has(selected) ? selected : 23;
      example.value = String(target);
      lanes.forEach(lane => { lane.probes = lane.trace(sample, target).probes; });
      last = Math.max(...lanes.map(lane => lane.probes.length));
      position = 1;
      render();
    }

    function moveTo(destination) {
      // Guard aria-disabled buttons without removing them from the keyboard order.
      if (destination < 1 || destination > last || destination === position) return;
      position = destination;
      render();
    }

    example.addEventListener("change", selectExample);
    previous.addEventListener("click", () => moveTo(position - 1));
    next.addEventListener("click", () => moveTo(position + 1));
    finish.addEventListener("click", () => moveTo(last));
    selectExample();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { sample, linearTrace, binaryTrace, mountComparison };
  }
  if (typeof document !== "undefined") {
    mountComparison(document.getElementById("algorithm-search-comparison"));
  }
})();
