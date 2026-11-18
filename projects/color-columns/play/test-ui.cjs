// Run the browser controller with the release WebAssembly build and a fake
// document. Visual layout and animation are covered separately in a browser.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Element {
  constructor() {
    this.handlers = {};
    this.children = [];
    this.disabled = false;
    this.textContent = '';
    this.value = '';
    this.dataset = {};
    this.focused = false;
  }

  addEventListener(name, handler) { this.handlers[name] = handler; }
  trigger(name, event = {}) { this.handlers[name]?.(event); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  focus() { this.focused = true; }
  getContext() { return { fillRect() {}, strokeRect() {}, fillText() {} }; }
}

function mockStorage() {
  const store = new Map();
  return {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, value); },
  };
}

async function loadPage({ seed = () => 6, localStorage = mockStorage() } = {}) {
  const ids = [
    'board', 'board-stage', 'game-robot', 'laser-overlay', 'next', 'score',
    'status', 'start', 'pause', 'player-name', 'leaderboard-scores', 'leaderboard-empty', 'exit',
  ];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  elements.start.disabled = true;
  elements.pause.disabled = true;
  const drop = new Element();
  drop.dataset.command = '5';
  const doc = {
    getElementById: id => elements[id] ?? null,
    querySelectorAll: () => [drop],
    createElement: () => new Element(),
    addEventListener() {},
  };
  const messages = [];
  const window = {
    localStorage,
    location: { origin: 'https://example.test' },
    parent: { postMessage(...args) { messages.push(args); } },
    matchMedia: () => ({ matches: true, addEventListener() {} }),
  };
  const math = Object.create(Math);
  math.random = () => (seed() + 0.5) / 0xffffffff;
  let timer = 0;
  const timers = new Map();
  const bytes = fs.readFileSync(path.join(__dirname, 'game.wasm'));
  const context = vm.createContext({
    document: doc, window, WebAssembly, Math: math,
    fetch: async () => ({ ok: true, arrayBuffer: async () => bytes }),
    setTimeout: fn => { timers.set(++timer, fn); return timer; },
    clearTimeout: id => timers.delete(id),
  });
  for (const script of ['leaderboard.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, script), 'utf8'), context, { filename: script });
  }

  for (let i = 0; i < 50 && elements.start.disabled; i++) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.equal(elements.start.disabled, false);
  assert.match(elements.status.textContent, /Ready/);
  return { elements, drop, timers, messages };
}

function dropOnLeft(page, count) {
  for (let i = 0; i < count; i++) {
    for (let move = 0; move < 9; move++) {
      page.elements.board.trigger('keydown', { key: 'ArrowLeft', preventDefault() {} });
    }
    page.drop.trigger('click');
  }
}

function scoreRows(elements) {
  return elements['leaderboard-scores'].children.map(row => {
    const [name, score] = row.children[0].children;
    return [name.textContent, Number(score.textContent)];
  });
}

test('browser controller loads the real game, starts, pauses and asks parent to exit', async () => {
  const { elements, drop, timers, messages } = await loadPage();
  elements.start.trigger('click');
  assert.equal(elements.pause.disabled, false);
  assert.equal(elements.score.textContent, '0');
  assert.ok(elements.board.focused);

  let prevented = false;
  elements.board.trigger('keydown', { key: 'ArrowLeft', preventDefault() { prevented = true; } });
  assert.ok(prevented);

  elements.pause.trigger('click');
  assert.equal(elements.pause.textContent, 'Resume');
  assert.equal(timers.size, 0);
  elements.pause.trigger('click');
  assert.equal(elements.pause.textContent, 'Pause');
  assert.equal(timers.size, 1);
  drop.trigger('click');
  assert.equal(timers.size, 1);

  elements.exit.trigger('click');
  assert.equal(timers.size, 0);
  assert.equal(messages[0][0].type, 'color-columns:exit');
  assert.equal(messages[0][1], 'https://example.test');
});

test('ranks the top five completed rounds, skips restarts, and restores scores when reopened', async () => {
  const localStorage = mockStorage();
  let seed = 6;
  const page = await loadPage({ seed: () => seed, localStorage });
  const { elements, timers } = page;
  const playerName = elements['player-name'];
  playerName.value = 'Restarted';
  elements.start.trigger('click');
  dropOnLeft(page, 3);
  assert.equal(elements.score.textContent, '3');
  assert.equal(playerName.disabled, true);
  assert.deepEqual(scoreRows(elements), []);

  // Restart a round with points before it reaches game over.
  elements.start.trigger('click');
  assert.equal(elements.score.textContent, '0');
  assert.deepEqual(scoreRows(elements), []);
  dropOnLeft(page, 7);
  assert.match(elements.status.textContent, /Game over\. Final score: 3\./);
  assert.equal(playerName.disabled, false);
  assert.equal(timers.size, 0);
  page.drop.trigger('click');
  assert.deepEqual(scoreRows(elements), [['Restarted', 3]]);

  for (const [name, roundSeed] of [['A', 8], ['B', 6], ['C', 8], ['D', 6], ['', 8]]) {
    seed = roundSeed;
    playerName.value = name;
    elements.start.trigger('click');
    dropOnLeft(page, roundSeed === 6 ? 7 : 8);
  }
  const expected = [['A', 5], ['C', 5], ['Player', 5], ['Restarted', 3], ['B', 3]];
  assert.deepEqual(scoreRows(elements), expected);
  assert.equal(elements['leaderboard-empty'].hidden, true);
  assert.equal(elements['leaderboard-scores'].hidden, false);

  const reopened = await loadPage({ localStorage });
  assert.deepEqual(scoreRows(reopened.elements), expected);
});
