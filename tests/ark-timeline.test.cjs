const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  class Element {
    constructor() { this.children = []; this.attrs = {}; this.handlers = {}; this.textContent = ''; this.disabled = false; }
    setAttribute(name, value) { this.attrs[name] = value; }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    replaceChildren() { this.children = []; }
    append(...nodes) { this.children.push(...nodes); }
    querySelector(selector) { return selector === '[aria-pressed="true"]' ? this.children.find(child => child.attrs['aria-pressed'] === 'true') : null; }
    focus() { this.focused = true; }
  }
  const ids = ['ark-timeline-items', 'ark-timeline-current', 'ark-timeline-back', 'ark-timeline-forward'];
  const nodes = Object.fromEntries(ids.map(id => [id, new Element()]));
  const document = { getElementById: id => nodes[id], createElement: () => new Element() };
  const reel = [
    {category:'Games',title:'Halo 2 / Reach'}, {category:'Books',title:'Dune'},
    {category:'Movies',title:'Blade Runner 2049'}, {category:'Games',title:'Unknown'},
    {category:'Games',title:'Later Game'}
  ];
  const window = { ARK_YEARS: {
    'Games::Halo 2 / Reach': {year: 2001, label:'Game series start'},
    'Books::Dune': {year: 1965, label:'First publication'},
    'Movies::Blade Runner 2049': {year: 2017, label:'Film release'},
    'Games::Later Game': {year: 2020, label:'Game release'}
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/ark-timeline.js'), 'utf8'), {window, document});
  let selected = null, browses = 0;
  let timeline;
  timeline = window.ARK_TIMELINE.init(reel, index => { selected = index; timeline.show(reel[index]); }, () => { browses++; });
  return {nodes, reel, timeline, get selected() { return selected; }, get browses() { return browses; }};
}

test('timeline sorts verified entries and highlights the featured favorite', () => {
  const p = setup(); p.timeline.show(p.reel[0]);
  assert.equal(p.nodes['ark-timeline-current'].textContent, '2001 · Game series start');
  const buttons = p.nodes['ark-timeline-items'].children;
  assert.deepEqual(buttons.map(b => b.children[0].textContent), ['1965', '2001', '2017']);
  assert.equal(buttons[1].attrs['aria-pressed'], 'true');
  assert.equal(buttons[1].children[1].textContent, 'Halo · Games');
});
test('timeline arrows notify the reel when visitors browse earlier or later entries', () => {
  const p = setup(); p.timeline.show(p.reel[0]);
  p.nodes['ark-timeline-forward'].handlers.click();
  assert.equal(p.browses, 1);
  assert.deepEqual(p.nodes['ark-timeline-items'].children.map(b => b.children[0].textContent), ['2001', '2017', '2020']);
  p.nodes['ark-timeline-back'].handlers.click();
  assert.equal(p.browses, 2);
});

test('unknown year is labeled, not guessed, and timeline buttons select and focus a favorite', () => {
  const p = setup(); p.timeline.show(p.reel[3]);
  assert.equal(p.nodes['ark-timeline-current'].textContent, 'Release year to confirm');
  const buttons = p.nodes['ark-timeline-items'].children;
  assert.ok(buttons.every(b => b.attrs['aria-pressed'] === 'false'));
  buttons[0].handlers.click();
  assert.equal(p.selected, 1);
  assert.equal(p.nodes['ark-timeline-current'].textContent, '1965 · First publication');
  assert.equal(p.nodes['ark-timeline-items'].children[0].focused, true);
});

test('current favorites have dated entries and source links', () => {
  const context = {window:{}};
  for (const file of ['ark-catalog.js', 'ark-years.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts', file), 'utf8'), context);
  }
  const keys = new Set(context.window.ARK_CATALOG.map(item => `${item.category}::${item.title}`));
  for (const title of ['Enders Game', 'Harry Potter Series', 'Dune', 'Halo: The Fall of Reach', 'Song of Ice and Fire Series']) keys.add(`Books::${title}`);
  assert.equal(keys.size, 138);
  for (const key of keys) {
    const date = context.window.ARK_YEARS[key];
    assert.ok(Number.isInteger(date?.year), `${key} has a year`);
    assert.equal(new URL(date.source).protocol, 'https:');
  }
});
