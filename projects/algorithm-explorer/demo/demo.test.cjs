// Run with node --test demo.test.cjs. No browser libraries are required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

function setup() {
  class Element {
    constructor() {
      this.value = '';
      this.textContent = '';
      this.disabled = false;
      this.hidden = false;
      this.listeners = {};
      this.attributes = {};
      this.children = [];
      this.classList = new Set();
    }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    replaceChildren(...children) { this.children = children; }
    appendChild(child) { this.children.push(child); }
    append(...children) { this.children.push(...children); }
    focus() { this.focused = true; }
    trigger(type) {
      let prevented = false;
      this.listeners[type]({ preventDefault: () => { prevented = true; } });
      return prevented;
    }
  }

  const ids = [
    'choose-search', 'choose-sort', 'values', 'target', 'target-field',
    'inputs', 'previous', 'next', 'finish', 'reset', 'feedback',
    'comparison-count', 'array', 'trace-note', 'step-count', 'result'
  ];
  const nodes = Object.fromEntries(ids.map(id => [id, new Element()]));
  nodes.values.value = '4 2 7 32 55 21';
  nodes.target.value = '32';
  nodes.array.parentElement = { scrollLeft: 0, clientWidth: 500 };
  const demo = { hidden: true, querySelector: selector => nodes[selector.slice('#algorithm-'.length)] };
  vm.runInNewContext(source, {
    document: { getElementById: id => id === 'algorithm-explorer' ? demo : null, createElement: () => new Element() }
  });
  assert.equal(demo.hidden, false);
  return nodes;
}

function stepToEnd(nodes) {
  for (let steps = 0; !nodes.next.disabled && steps < 2000; steps++) nodes.next.trigger('click');
  assert.ok(nodes.next.disabled, 'Algorithm should finish');
}

test('search finds the first duplicate and counts comparisons', () => {
  const nodes = setup();
  nodes.values.value = '8 2 8';
  nodes.target.value = '8';
  assert.ok(nodes.inputs.trigger('submit'));
  stepToEnd(nodes);
  assert.equal(nodes.result.textContent, 'Found at index 0');
  assert.equal(nodes['comparison-count'].textContent, '1');
});

test('search reports missing and empty inputs', () => {
  const nodes = setup();
  nodes.values.value = '3 5';
  nodes.target.value = '2';
  nodes.inputs.trigger('submit');
  stepToEnd(nodes);
  assert.equal(nodes.result.textContent, 'Not found');
  assert.equal(nodes['comparison-count'].textContent, '2');
  nodes.values.value = '';
  nodes.inputs.trigger('submit');
  stepToEnd(nodes);
  assert.equal(nodes.result.textContent, 'Not found');
  assert.equal(nodes['comparison-count'].textContent, '0');
});

test('selection sort handles negatives and duplicates with the correct count', () => {
  const nodes = setup();
  nodes['choose-sort'].trigger('click');
  assert.equal(nodes['target-field'].hidden, true);
  nodes.values.value = '3 3 -1 2 10';
  nodes.inputs.trigger('submit');
  nodes.next.trigger('click');
  assert.equal(nodes['trace-note'].textContent, 'Compare index 1 (3) with the minimum at index 0 (3). The minimum stays at index 0.');
  stepToEnd(nodes);
  assert.equal(nodes.result.textContent, '-1 2 3 3 10');
  assert.equal(nodes['comparison-count'].textContent, '10');
  assert.ok(nodes.array.children.every(cell => cell.classList.has('sorted')));
});

test('empty and single-value sort have zero comparisons', () => {
  const nodes = setup();
  nodes['choose-sort'].trigger('click');
  nodes.values.value = '';
  nodes.inputs.trigger('submit');
  stepToEnd(nodes);
  assert.equal(nodes.result.textContent, 'Empty list');
  assert.equal(nodes['comparison-count'].textContent, '0');
  nodes.values.value = '-12';
  nodes.inputs.trigger('submit');
  stepToEnd(nodes);
  assert.equal(nodes.result.textContent, '-12');
  assert.equal(nodes['comparison-count'].textContent, '0');
});

test('invalid input is rejected and editing clears the current trace', () => {
  const nodes = setup();
  nodes.inputs.trigger('submit');
  nodes.next.trigger('click');
  nodes.values.value = '1,2';
  nodes.values.trigger('input');
  assert.equal(nodes.next.disabled, true);
  nodes.inputs.trigger('submit');
  assert.match(nodes.feedback.textContent, /whole numbers/);
  assert.equal(nodes.values.attributes['aria-invalid'], 'true');
  nodes.values.value = '2147483648';
  nodes.inputs.trigger('submit');
  assert.match(nodes.feedback.textContent, /32-bit/);
  nodes.values.value = Array(51).fill('1').join(' ');
  nodes.inputs.trigger('submit');
  assert.match(nodes.feedback.textContent, /50/);
  nodes.values.value = '1 -2147483648';
  nodes.target.value = '1.5';
  nodes.inputs.trigger('submit');
  assert.equal(nodes.values.attributes['aria-invalid'], undefined);
  assert.equal(nodes.target.attributes['aria-invalid'], 'true');
  assert.equal(nodes.target.focused, true);
});

test('previous, next, and reset keep the trace and display in sync', () => {
  const nodes = setup();
  assert.equal(nodes.previous.disabled, true);
  assert.equal(nodes.finish.disabled, true);
  nodes.inputs.trigger('submit');
  nodes.next.trigger('click');
  nodes.next.trigger('click');
  assert.equal(nodes['step-count'].textContent, '2');
  assert.ok(nodes.array.children[1].classList.has('active'));
  nodes.previous.trigger('click');
  assert.equal(nodes['step-count'].textContent, '1');
  assert.ok(nodes.array.children[0].classList.has('active'));
  nodes.previous.trigger('click');
  assert.equal(nodes.result.textContent, 'Ready');
  assert.equal(nodes.previous.disabled, true);
  assert.equal(nodes['comparison-count'].textContent, '0');
  nodes.values.value = '6';
  nodes.target.value = '6';
  nodes.reset.trigger('click');
  assert.equal(nodes.values.value, '4 2 7 32 55 21');
  assert.equal(nodes.target.value, '32');
  assert.equal(nodes.result.textContent, 'Not started');
  assert.equal(nodes.next.disabled, true);
});

test('Show result skips a long trace and previous returns to the last placement', () => {
  const nodes = setup();
  nodes['choose-sort'].trigger('click');
  nodes.values.value = Array.from({ length: 50 }, (_, index) => 50 - index).join(' ');
  nodes.inputs.trigger('submit');
  nodes.finish.trigger('click');
  assert.equal(nodes['comparison-count'].textContent, '1225');
  assert.equal(nodes.result.textContent, Array.from({ length: 50 }, (_, index) => index + 1).join(' '));
  assert.equal(nodes.next.disabled, true);
  assert.equal(nodes.finish.disabled, true);
  nodes.previous.trigger('click');
  assert.equal(nodes.result.textContent, 'Sorting');
  assert.equal(nodes.next.disabled, false);
  assert.match(nodes['trace-note'].textContent, /^Place 49/);
});
