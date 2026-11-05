/* Browser-only educational adaptation of the user's C++ class projects.
   This demonstration never runs the local C++ application. */
(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const elements = Object.fromEntries(["choose-search", "choose-sort", "values", "target", "target-field", "start", "next", "reset", "feedback", "comparison-count", "array", "trace-note", "step-count", "result"].map(id => [id, byId(id)]));
  const initialValues = "4 2 7 32 55 21";
  let algorithm = "search";
  let trace = [];
  let position = -1;

  // C++ int range is explicit so the same example fits a typical 32-bit int.
  function parseNumber(token) {
    if (!/^[+-]?\d+$/.test(token)) return null;
    const number = Number(token);
    return Number.isInteger(number) && number >= -2147483648 && number <= 2147483647 ? number : null;
  }
  function parseList(input) {
    const tokens = input.trim() ? input.trim().split(/\s+/) : [];
    if (tokens.length > 50) return { error: "Enter no more than 50 numbers." };
    const numbers = tokens.map(parseNumber);
    if (numbers.some(value => value === null)) return { error: "Use whole numbers within the 32-bit integer range, separated by spaces." };
    return { numbers };
  }

  function searchTrace(numbers, target) {
    const states = [];
    for (let index = 0; index < numbers.length; index++) {
      const matched = numbers[index] === target;
      states.push({ values: [...numbers], current: index, comparisons: index + 1,
        message: `Compare index ${index}: ${numbers[index]} ${matched ? "matches" : "does not match"} ${target}.`,
        result: matched ? `Found at index ${index}` : "Searching", complete: matched });
      if (matched) return states; // The first match is the result.
    }
    states.push({ values: [...numbers], comparisons: numbers.length, message: "No match was found.", result: "Not found", complete: true });
    return states;
  }
  function sortTrace(numbers) {
    const values = [...numbers];
    const states = [];
    let comparisons = 0;
    for (let start = 0; start < values.length - 1; start++) {
      let minimum = start;
      for (let candidate = start + 1; candidate < values.length; candidate++) {
        const previousMinimum = minimum;
        const smaller = values[candidate] < values[minimum];
        if (smaller) minimum = candidate;
        comparisons++;
        states.push({ values: [...values], current: candidate, minimum, sortedThrough: start - 1, comparisons,
          message: `Compare ${values[candidate]} with ${values[previousMinimum]}. ${smaller ? `${values[candidate]} is the new minimum.` : `${values[minimum]} remains the minimum.`}`,
          result: "Sorting", complete: false });
      }
      // A completed pass places the minimum at the next sorted position.
      [values[start], values[minimum]] = [values[minimum], values[start]];
      states.push({ values: [...values], minimum: start, sortedThrough: start, comparisons,
        message: `Place ${values[start]} at index ${start}.`, result: "Sorting", complete: false });
    }
    states.push({ values: [...values], sortedThrough: values.length - 1, comparisons,
      message: values.length ? "The numbers are sorted." : "The empty list is already sorted.",
      result: values.length ? values.join(" ") : "Empty list", complete: true });
    return states;
  }
  function draw(values, current = -1, minimum = -1, sortedThrough = -1) {
    const array = elements.array;
    array.replaceChildren();
    if (!values.length) {
      const empty = document.createElement("p"); empty.className = "array-empty"; empty.textContent = "No numbers in this list."; array.appendChild(empty); return;
    }
    values.forEach((value, index) => {
      const box = document.createElement("div");
      box.className = "cell";
      if (index <= sortedThrough) box.classList.add("sorted");
      if (index === current) box.classList.add("active");
      if (index === minimum) box.classList.add("minimum");
      const number = document.createElement("span"); number.textContent = String(value);
      const label = document.createElement("small"); label.textContent = `index ${index}`;
      box.append(number, label); array.appendChild(box);
    });
  }
  function resetView() {
    trace = []; position = -1; elements.next.disabled = true;
    elements["comparison-count"].textContent = "0"; elements["step-count"].textContent = "0";
    elements.result.textContent = "Not started"; elements["trace-note"].textContent = "Choose an algorithm and press Start to begin.";
    elements.feedback.textContent = "";
    const parsed = parseList(elements.values.value); draw(parsed.numbers || []);
  }
  function choose(next) {
    algorithm = next;
    elements["choose-search"].setAttribute("aria-pressed", String(next === "search"));
    elements["choose-sort"].setAttribute("aria-pressed", String(next === "sort"));
    elements["target-field"].hidden = next !== "search";
    resetView();
  }
  elements["choose-search"].addEventListener("click", () => choose("search"));
  elements["choose-sort"].addEventListener("click", () => choose("sort"));
  elements.start.addEventListener("click", () => {
    const parsed = parseList(elements.values.value);
    if (parsed.error) { elements.feedback.textContent = parsed.error; return; }
    if (algorithm === "search") {
      const target = parseNumber(elements.target.value.trim());
      if (target === null) { elements.feedback.textContent = "Enter one whole number to find."; return; }
      trace = searchTrace(parsed.numbers, target);
    } else trace = sortTrace(parsed.numbers);
    position = -1; elements.feedback.textContent = ""; elements.next.disabled = false;
    elements["comparison-count"].textContent = "0"; elements["step-count"].textContent = "0";
    elements.result.textContent = "Ready"; elements["trace-note"].textContent = "Press Next step to continue.";
    draw(parsed.numbers);
  });
  elements.next.addEventListener("click", () => {
    if (position + 1 >= trace.length) return;
    const current = trace[++position];
    draw(current.values, current.current, current.minimum, current.sortedThrough);
    elements["comparison-count"].textContent = String(current.comparisons);
    elements["step-count"].textContent = String(position + 1);
    elements["trace-note"].textContent = current.message; elements.result.textContent = current.result;
    elements.next.disabled = current.complete;
  });
  elements.reset.addEventListener("click", () => { elements.values.value = initialValues; elements.target.value = "32"; resetView(); });
  // Editing inputs invalidates the trace so the display cannot misrepresent it.
  elements.values.addEventListener("input", resetView);
  elements.target.addEventListener("input", resetView);
  resetView();
})();
