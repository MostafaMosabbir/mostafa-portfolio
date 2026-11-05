const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup({reduced = false, observeIntersection = false, seed = 42} = {}) {
  const ids = ['creative-view', 'ark-feature-title', 'ark-feature-category', 'ark-feature-image', 'ark-feature-placeholder', 'ark-feature-credit', 'ark-feature-source', 'ark-previous', 'ark-next', 'ark-progress-bar', 'ark-position', 'ark-reel', 'ark-feature-info', 'ark-play-toggle', 'ark-motion-status'];
  const nodes = Object.fromEntries(ids.map(id => [id, { hidden: false, textContent: '', attrs: {}, style: {}, handlers: {}, classList: {add(){}, remove(){}}, addEventListener(k, f) { this.handlers[k] = f; }, setAttribute(k,v) { this.attrs[k] = String(v); }, removeAttribute(k) { delete this.attrs[k]; }, getAttribute(k) { return this.attrs[k] || null; }, hasAttribute(k) { return Object.hasOwn(this.attrs, k); }, set src(v) { this.attrs.src = v; }, set href(v) { this.attrs.href = v; } }]));
  nodes['creative-view'].hidden = true;
  const catalog = [{category:'Games',title:'Halo 2 / Reach'}, {category:'Games',title:'Game Two'}, {category:'TV',title:'TV One'}, {category:'Movies',title:'Movie One'}, {category:'Music',title:'Album One'}, {category:'Movies',title:'Movie One'}];
  const art = {'Games::Halo 2 / Reach': {url:'https://example.com/halo.jpg', source:'https://example.com/halo', label:'Official artwork: Halo: Reach'}};
  let observer;
  const document = { hidden: false, handlers: {}, getElementById: id => nodes[id], addEventListener(k,f) { this.handlers[k] = f; } };
  const motion = { matches: reduced, handlers: {}, addEventListener(k,f) { this.handlers[k] = f; } };
  let clock = 0, timerId = 0; const timers = new Map();
  function setTimeoutFake(fn, delay) { const id = ++timerId; timers.set(id, {fn, at: clock + delay}); return id; }
  function clearTimeoutFake(id) { timers.delete(id); }
  function tick(ms) { const end = clock + ms; for (;;) { const next = [...timers.entries()].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0]; if (!next) break; clock = next[1].at; timers.delete(next[0]); next[1].fn(); } clock = end; }
  class MutationObserver { constructor(f) { observer = f; } observe() {} }
  let onIntersection;
  class IntersectionObserver { constructor(f) { onIntersection = f; } observe() {} }
  const script = fs.readFileSync(path.join(__dirname, '../scripts/the-ark-index-preview.js'), 'utf8');
  // Seed the random source so the shuffle tests are repeatable.
  let state = seed >>> 0;
  const math = Object.create(Math);
  math.random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 0x100000000; };
  const context = { document, MutationObserver, Math: math, setTimeout:setTimeoutFake, clearTimeout:clearTimeoutFake, window: { ARK_CATALOG: catalog, ARK_ART_SOURCES: art, matchMedia: () => motion } };
  if (observeIntersection) context.IntersectionObserver = IntersectionObserver;
  vm.runInNewContext(script, context);
  return {nodes, document, motion, tick, intersect(visible) { onIntersection([{target:nodes['ark-reel'],isIntersecting:visible}]); }, open() { nodes['creative-view'].hidden = false; observer(); }, next() { nodes['ark-next'].handlers.click(); }, prev() { nodes['ark-previous'].handlers.click(); }, current() { return nodes['ark-feature-title'].textContent; }, category() { const c = nodes['ark-feature-category'].textContent; return c === 'Game series' ? 'Games' : c; }};
}

function sequence(p) { const out = []; for (let i = 0; i < 10; i++) { out.push([p.current(), p.category()]); p.next(); } return out; }

test('each visit shuffles every unique title and mixes categories where possible', () => {
  const p = setup({seed:42}); p.open(); const a = sequence(p);
  const q = setup({seed:123456}); q.open(); const b = sequence(q);
  assert.notDeepEqual(a, b);
  assert.ok(new Set(Array.from({length: 16}, (_, i) => setup({seed: i + 1}).current())).size > 1);
  assert.equal(new Set(a.map(([title, category]) => category + ':' + title)).size, 10);
  assert.ok(a.some(([title]) => title === 'Halo'));
  for (const name of ['Enders Game', 'Harry Potter Series', 'Dune', 'Halo: The Fall of Reach', 'Song of Ice and Fire Series']) assert.ok(a.some(([title]) => title === name));
  for (let i = 1; i < a.length; i++) assert.notEqual(a[i][1], a[i - 1][1]);
});
test('navigation preserves the shuffled order, wraps, and defers image requests', () => {
  const p = setup(); assert.equal(p.nodes['ark-feature-image'].getAttribute('src'), null); p.open();
  const first = p.current(); p.next(); const second = p.current(); p.prev(); assert.equal(p.current(), first); p.next(); assert.equal(p.current(), second);
  for (let i = 0; i < 9; i++) p.next(); assert.equal(p.current(), first);
  for (let i = 0; i < 10 && p.current() !== 'Halo'; i++) p.next();
  assert.equal(p.current(), 'Halo'); assert.equal(p.nodes['ark-feature-image'].getAttribute('src'), 'https://example.com/halo.jpg');
});
test('book entries use honest placeholders without inventing art', () => {
  const p = setup(); p.open(); for (let i = 0; i < 10 && p.current() !== 'Enders Game'; i++) p.next();
  assert.equal(p.current(), 'Enders Game'); assert.equal(p.nodes['ark-feature-placeholder'].textContent, 'Artwork is not available for this title yet.');
});
test('the reel fades forward after eight seconds and manual navigation pauses it', () => {
  const p = setup(); p.open(); const first = p.current(); p.tick(8000); assert.equal(p.current(), first);
  p.tick(250); const second = p.current(); assert.notEqual(second, first); assert.equal(p.nodes['ark-feature-info'].getAttribute('aria-live'), 'off');
  p.prev(); assert.equal(p.current(), first); assert.equal(p.nodes['ark-feature-info'].getAttribute('aria-live'), 'polite');
  p.tick(20000); assert.equal(p.current(), first); assert.equal(p.nodes['ark-play-toggle'].textContent, 'Resume reel');
  p.nodes['ark-play-toggle'].handlers.click(); p.tick(8250); assert.equal(p.current(), second);
});
test('a reel outside the viewport stops its timers and resumes when visible', () => {
  const p = setup({observeIntersection:true}); p.open(); const first = p.current(); p.tick(20000); assert.equal(p.current(), first);
  p.intersect(true); p.tick(8250); const second = p.current(); assert.notEqual(second, first);
  p.intersect(false); p.tick(20000); assert.equal(p.current(), second);
  p.intersect(true); p.tick(8250); assert.notEqual(p.current(), second);
});
test('reduced motion and hidden tabs stop rotation without preventing manual use', () => {
  const p = setup({reduced:true}); p.open(); const first = p.current(); p.tick(20000); assert.equal(p.current(), first);
  assert.equal(p.nodes['ark-play-toggle'].hidden, true); p.next(); assert.notEqual(p.current(), first);
  const q = setup(); q.open(); const initial = q.current(); q.document.hidden = true; q.document.handlers.visibilitychange(); q.tick(20000);
  assert.equal(q.current(), initial); q.document.hidden = false; q.document.handlers.visibilitychange(); q.tick(8250); assert.notEqual(q.current(), initial);
});
