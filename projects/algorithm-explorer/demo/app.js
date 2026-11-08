/* Browser-only educational adaptation of the user's C++ class projects.
   This demonstration never runs the local C++ application. */
(() => {
  "use strict";
  const demo = document.getElementById("algorithm-explorer");
  if (!demo) return;
  const ids = [
    "choose-search", "choose-sort", "values", "target", "target-field",
    "inputs", "previous", "next", "finish", "reset", "feedback",
    "comparison-count", "array", "trace-note", "step-count", "result"
  ];
  const elements = Object.fromEntries(ids.map(id => [id, demo.querySelector(`#algorithm-${id}`)]));
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
        result: matched ? `Found at index ${index}` : "Searching" });
      if (matched) return states; // The first match is the result.
    }
    states.push({ values: [...numbers], comparisons: numbers.length, message: "No match was found.", result: "Not found" });
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
        const compared = `Compare index ${candidate} (${values[candidate]}) with the minimum at index ${previousMinimum} (${values[previousMinimum]}).`;
        const outcome = smaller ? `The minimum moves to index ${minimum}.` : `The minimum stays at index ${minimum}.`;
        states.push({ values: [...values], current: candidate, minimum, sortedThrough: start - 1, comparisons,
          message: `${compared} ${outcome}`,
          result: "Sorting" });
      }
      // A completed pass places the minimum at the next sorted position.
      [values[start], values[minimum]] = [values[minimum], values[start]];
      states.push({ values: [...values], minimum: start, sortedThrough: start, comparisons,
        message: `Place ${values[start]} at index ${start}.`, result: "Sorting" });
    }
    states.push({ values: [...values], sortedThrough: values.length - 1, comparisons,
      message: values.length ? "The numbers are sorted." : "The empty list is already sorted.",
      result: values.length ? values.join(" ") : "Empty list" });
    return states;
  }
  function draw(values, current = -1, minimum = -1, sortedThrough = -1) {
    const array = elements.array;
    const scroller = array.parentElement;
    array.replaceChildren();
    if (!values.length) {
      const empty = document.createElement("div");
      empty.setAttribute("role", "listitem");
      empty.className = "array-empty";
      empty.textContent = "No numbers in this list.";
      array.appendChild(empty);
      return;
    }
    values.forEach((value, index) => {
      const box = document.createElement("div");
      box.setAttribute("role", "listitem");
      box.className = "cell";
      if (index <= sortedThrough) box.classList.add("sorted");
      if (index === current) box.classList.add("active");
      if (index === minimum) box.classList.add("minimum");
      const number = document.createElement("span");
      number.textContent = String(value);
      const label = document.createElement("small");
      label.textContent = `index ${index}`;
      box.append(number, label);
      array.appendChild(box);
    });

    // Follow the comparison within the strip without moving the page or focus.
    const activeCell = array.children[current >= 0 ? current : minimum];
    if (activeCell) {
      const left = activeCell.offsetLeft;
      const right = left + activeCell.offsetWidth;
      if (left < scroller.scrollLeft) scroller.scrollLeft = left;
      if (right > scroller.scrollLeft + scroller.clientWidth) scroller.scrollLeft = right - scroller.clientWidth;
    }
  }

  function renderStep() {
    const state = trace[position];
    const ready = trace.length > 0;
    const lastStep = !ready || position === trace.length - 1;
    elements.previous.disabled = position < 0;
    elements.next.disabled = lastStep;
    elements.finish.disabled = lastStep;
    elements["comparison-count"].textContent = String(state?.comparisons ?? 0);
    elements["step-count"].textContent = String(position + 1);
    elements.result.textContent = state?.result ?? (ready ? "Ready" : "Not started");
    elements["trace-note"].textContent = state?.message ??
      (ready ? "Press Next step to continue." : "Choose an algorithm and press Start to begin.");

    // Before the first step, show the unsorted input captured by the trace.
    if (state) {
      draw(state.values, state.current, state.minimum, state.sortedThrough);
    } else {
      elements.array.parentElement.scrollLeft = 0;
      draw(trace[0]?.values ?? parseList(elements.values.value).numbers ?? []);
    }
  }

  function clearFeedback() {
    elements.feedback.textContent = "";
    elements.values.removeAttribute("aria-invalid");
    elements.target.removeAttribute("aria-invalid");
  }

  function resetView() {
    trace = [];
    position = -1;
    clearFeedback();
    renderStep();
  }

  function choose(next) {
    if (next === algorithm) return;
    algorithm = next;
    elements["choose-search"].setAttribute("aria-pressed", String(next === "search"));
    elements["choose-sort"].setAttribute("aria-pressed", String(next === "sort"));
    elements["target-field"].hidden = next !== "search";
    resetView();
  }

  function rejectInput(field, message) {
    resetView();
    field.setAttribute("aria-invalid", "true");
    elements.feedback.textContent = message;
    field.focus();
  }

  elements["choose-search"].addEventListener("click", () => choose("search"));
  elements["choose-sort"].addEventListener("click", () => choose("sort"));
  elements.inputs.addEventListener("submit", event => {
    event.preventDefault();
    const parsed = parseList(elements.values.value);
    if (parsed.error) {
      rejectInput(elements.values, parsed.error);
      return;
    }
    if (algorithm === "search") {
      const target = parseNumber(elements.target.value.trim());
      if (target === null) {
        rejectInput(elements.target, "Enter one whole number in the 32-bit integer range.");
        return;
      }
      trace = searchTrace(parsed.numbers, target);
    } else trace = sortTrace(parsed.numbers);
    position = -1;
    clearFeedback();
    renderStep();
  });

  function moveTo(step) {
    if (!trace.length || step < -1 || step >= trace.length) return;
    position = step;
    renderStep();
  }

  elements.previous.addEventListener("click", () => moveTo(position - 1));
  elements.next.addEventListener("click", () => moveTo(position + 1));
  elements.finish.addEventListener("click", () => moveTo(trace.length - 1));
  elements.reset.addEventListener("click", () => {
    elements.values.value = initialValues;
    elements.target.value = "32";
    resetView();
  });
  // Editing inputs invalidates the trace so the display cannot misrepresent it.
  elements.values.addEventListener("input", resetView);
  elements.target.addEventListener("input", resetView);
  resetView();
  demo.hidden = false;
})();
