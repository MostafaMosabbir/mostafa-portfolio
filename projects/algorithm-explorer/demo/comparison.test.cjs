const { test } = require("node:test");
const assert = require("node:assert/strict");
const { sample, linearTrace, binaryTrace, mountComparison } = require("./comparison.js");

test("the four examples reproduce the expected probe sequences and first-match results", () => {
  const cases = [
    { target: 23, foundIndex: 7, linear: [0, 1, 2, 3, 4, 5, 6, 7], binary: [3, 5, 6, 7] },
    { target: 2, foundIndex: 0, linear: [0], binary: [3, 1, 0] },
    { target: 7, foundIndex: 2, linear: [0, 1, 2], binary: [3, 1, 2] },
    { target: 10, foundIndex: null, linear: [0, 1, 2, 3, 4, 5, 6, 7], binary: [3, 5, 4] }
  ];
  for (const example of cases) {
    for (const [trace, expected] of [[linearTrace, example.linear], [binaryTrace, example.binary]]) {
      const result = trace(sample, example.target);
      assert.equal(result.foundIndex, example.foundIndex);
      assert.deepEqual(result.probes.map(({ index }) => index), expected);
      assert.ok(result.probes.every(({ index, value, matched }) =>
        value === sample[index] && matched === (value === example.target)));
    }
  }
});

test("the duplicate example tracks candidates and shrinks the inclusive window", () => {
  const { probes } = binaryTrace(sample, 7);
  assert.deepEqual(
    probes.map(({ low, high, index, foundIndex }) => [low, high, index, foundIndex]),
    [[0, 7, 3, 3], [0, 2, 1, 3], [2, 2, 2, 2]]
  );
});

test("binary search handles empty, all-equal, and signed inputs without mutating the list", () => {
  assert.deepEqual(binaryTrace([], 7), { probes: [], foundIndex: null });
  assert.equal(binaryTrace([7, 7, 7, 7], 7).foundIndex, 0);
  const values = Object.freeze([-2147483648, -7, -7, 0, 2147483647]);
  for (const target of [-2147483648, -8, -7, 0, 1, 2147483647]) {
    assert.equal(binaryTrace(values, target).foundIndex, linearTrace(values, target).foundIndex);
  }
});

function setup() {
  class Element {
    constructor(children = {}) {
      this.nodes = children;
      this.dataset = {};
      this.attributes = {};
      this.children = [];
      this.listeners = {};
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    querySelector(selector) { return this.nodes[selector]; }
    trigger(name) { this.listeners[name](); }
  }
  const createParts = names => Object.fromEntries(names.map(name => [`[data-${name}]`, new Element()]));
  const controls = createParts(["example", "previous", "next", "finish", "position", "live"]);
  const linear = new Element(createParts(["count", "array", "detail", "result"]));
  const binary = new Element(createParts(["count", "array", "detail", "result"]));
  const root = new Element({ ...controls, '[data-lane="linear"]': linear, '[data-lane="binary"]': binary });
  root.ownerDocument = { createElement: () => new Element() };
  controls["[data-example]"].value = "23";
  mountComparison(root);
  return { control: name => controls[`[data-${name}]`], linear, binary };
}

test("both lanes step together and the shorter search stays complete until rewound", () => {
  const { control, linear, binary } = setup();
  const position = control("position");
  const previous = control("previous");
  const next = control("next");
  const binaryCount = binary.querySelector("[data-count]");
  const binaryResult = binary.querySelector("[data-result]");
  assert.equal(position.textContent, "Step 1 of 8");
  assert.equal(previous.attributes["aria-disabled"], "true");
  previous.trigger("click");
  assert.equal(position.textContent, "Step 1 of 8");

  for (let step = 2; step <= 5; step++) next.trigger("click");
  assert.equal(position.textContent, "Step 5 of 8");
  assert.equal(linear.querySelector("[data-count]").textContent, "5 probes");
  assert.equal(binaryCount.textContent, "4 probes");
  assert.equal(binaryResult.textContent, "First match at index 7");

  previous.trigger("click");
  previous.trigger("click");
  assert.equal(binaryCount.textContent, "3 probes");
  assert.equal(binaryResult.textContent, "Searching");
  assert.match(control("live").textContent, /Binary search: 3 probes\. Searching/);
});

test("example changes rewind the comparison and Show results reaches the shared end", () => {
  const { control, linear, binary } = setup();
  const example = control("example");
  const next = control("next");
  const finish = control("finish");
  const position = control("position");
  finish.trigger("click");
  assert.equal(position.textContent, "Step 8 of 8");
  assert.equal(finish.attributes["aria-disabled"], "true");
  assert.equal(next.attributes["aria-disabled"], "true");
  next.trigger("click");
  assert.equal(position.textContent, "Step 8 of 8");

  example.value = "7";
  example.trigger("change");
  assert.equal(position.textContent, "Step 1 of 3");
  assert.equal(binary.querySelector("[data-result]").textContent, "Candidate at index 3");
  const cells = binary.querySelector("[data-array]").children;
  assert.equal(cells[3].dataset.probe, "true");
  next.trigger("click");
  assert.equal(cells[1].dataset.probe, "true");
  assert.equal(cells[3].dataset.probe, "false");
  assert.equal(cells[3].dataset.outside, "true");
  assert.match(cells[3].attributes["aria-label"], /outside this search window/);
  finish.trigger("click");
  assert.equal(binary.querySelector("[data-result]").textContent, "First match at index 2");
  assert.equal(linear.querySelector("[data-result]").textContent, "First match at index 2");
});
