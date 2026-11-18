const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'leaderboard.js'), 'utf8');

function create(window) {
  vm.runInNewContext(source, { window });
  return window.ColorColumnsLeaderboard.create();
}

function mockStorage(value = null) {
  return {
    getItem() { return value; },
    setItem(_key, next) { value = next; },
  };
}

function rows(leaderboard) {
  return JSON.parse(JSON.stringify(leaderboard.read()));
}

test('preserves the top five scores, tracks ties in order, and reads across sessions', () => {
  const localStorage = mockStorage();
  const first = create({ localStorage });
  const second = create({ localStorage });

  first.record('', 10);
  second.record('Later', 10);
  first.record('Best', 20);
  first.record('Third', 12);
  second.record('Weak', 1);
  first.record('Fourth', 11);
  first.record('Zero', 0);
  first.record('Fraction', 99.5);

  assert.deepEqual(rows(second), [
    { name: 'Best', score: 20 },
    { name: 'Third', score: 12 },
    { name: 'Fourth', score: 11 },
    { name: 'Player', score: 10 },
    { name: 'Later', score: 10 },
  ]);
});

test('ignores corrupted saved scores and normalizes player names', () => {
  const corrupted = create({ localStorage: mockStorage('{broken') });
  assert.deepEqual(rows(corrupted), []);
  corrupted.record('  A\u0000lice\u202E ', 9);
  corrupted.record('123456789012345⭐x', 8);
  assert.deepEqual(rows(corrupted), [
    { name: 'Alice', score: 9 },
    { name: '123456789012345⭐', score: 8 },
  ]);

  const invalid = create({ localStorage: mockStorage('[null,{"name":"Bad","score":"12"},{"score":7}]') });
  assert.deepEqual(rows(invalid), [{ name: 'Player', score: 7 }]);
});

test('keeps session scores when storage is blocked and merges recovered storage once', () => {
  const localStorage = mockStorage('[{"name":"Saved","score":15}]');
  let readDenied = true;
  const write = localStorage.setItem;
  let writeDenied = true;
  localStorage.setItem = (...args) => {
    if (writeDenied) throw new Error('Storage quota');
    write(...args);
  };
  const leaderboard = create({
    get localStorage() {
      if (readDenied) throw new Error('Storage blocked');
      return localStorage;
    },
  });

  leaderboard.record('Offline', 10);
  assert.deepEqual(rows(leaderboard), [{ name: 'Offline', score: 10 }]);
  readDenied = false;
  leaderboard.record('Write denied', 12);
  assert.equal(rows(leaderboard).length, 3);
  writeDenied = false;
  leaderboard.record('After recovery', 20);

  const entryList = [
    { name: 'After recovery', score: 20 },
    { name: 'Saved', score: 15 },
    { name: 'Write denied', score: 12 },
    { name: 'Offline', score: 10 },
  ];
  assert.deepEqual(rows(leaderboard), entryList);
  assert.deepEqual(rows(create({ localStorage })), entryList);
});
