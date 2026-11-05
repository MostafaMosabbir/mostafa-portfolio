// Run: node --test preview.test.cjs. No browser libraries are required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

function setup() {
  class Element {
    constructor() { this.value=''; this.textContent=''; this.disabled=false; this.hidden=false; this.listeners={}; this.children=[]; this.classList={ add() {} }; }
    addEventListener(type, callback) { this.listeners[type]=callback; }
    setAttribute() {}
    replaceChildren(...children) { this.children=children; }
    appendChild(child) { this.children.push(child); }
    append(...children) { this.children.push(...children); }
    trigger(type) { this.listeners[type]?.(); }
  }
  const ids = ['choose-search','choose-sort','values','target','target-field','start','next','reset','feedback','comparison-count','array','trace-note','step-count','result'];
  const nodes = Object.fromEntries(ids.map(id => [id,new Element()]));
  nodes.values.value='4 2 7 32 55 21'; nodes.target.value='32';
  vm.runInNewContext(source, {document:{getElementById:id=>nodes[id],createElement:()=>new Element()}});
  return nodes;
}
function finish(nodes) {
  let steps=0;
  while (!nodes.next.disabled && steps++<2000) nodes.next.trigger('click');
  assert.ok(nodes.next.disabled, 'Algorithm should finish');
}

test('search finds the first duplicate and counts comparisons', () => {
  const n=setup(); n.values.value='8 2 8'; n.target.value='8'; n.start.trigger('click'); finish(n);
  assert.equal(n.result.textContent,'Found at index 0'); assert.equal(n['comparison-count'].textContent,'1');
});
test('search reports missing and empty inputs', () => {
  const n=setup(); n.values.value='3 5'; n.target.value='2'; n.start.trigger('click'); finish(n);
  assert.equal(n.result.textContent,'Not found'); assert.equal(n['comparison-count'].textContent,'2');
  n.values.value=''; n.start.trigger('click'); finish(n);
  assert.equal(n.result.textContent,'Not found'); assert.equal(n['comparison-count'].textContent,'0');
});
test('selection sort handles negatives and duplicates with correct comparison count', () => {
  const n=setup(); n['choose-sort'].trigger('click'); n.values.value='3 -1 3 2 10'; n.start.trigger('click'); finish(n);
  assert.equal(n.result.textContent,'-1 2 3 3 10'); assert.equal(n['comparison-count'].textContent,'10');
});
test('empty and single-value sort have zero comparisons', () => {
  const n=setup(); n['choose-sort'].trigger('click'); n.values.value=''; n.start.trigger('click'); finish(n);
  assert.equal(n.result.textContent,'Empty list'); assert.equal(n['comparison-count'].textContent,'0');
  n.values.value='-12'; n.start.trigger('click'); finish(n);
  assert.equal(n.result.textContent,'-12'); assert.equal(n['comparison-count'].textContent,'0');
});
test('invalid input is rejected and editing clears a previous trace', () => {
  const n=setup(); n.start.trigger('click'); n.next.trigger('click');
  n.values.value='1,2'; n.values.trigger('input'); assert.equal(n.next.disabled,true);
  n.start.trigger('click'); assert.match(n.feedback.textContent,/whole numbers/);
  n.values.value='2147483648'; n.start.trigger('click'); assert.match(n.feedback.textContent,/32-bit/);
  n.values.value=Array(51).fill('1').join(' '); n.start.trigger('click'); assert.match(n.feedback.textContent,/50/);
});
