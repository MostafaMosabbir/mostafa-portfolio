// Run with Node after compiling game.wasm and the test-only game-test.wasm.
// These checks exercise the actual Rust-produced WebAssembly, not a JS model.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
async function load(name) {
  const bytes = fs.readFileSync(path.join(__dirname, name));
  return (await WebAssembly.instantiate(bytes, {})).instance.exports;
}
function activeColumn(g) {
  for (let x=0; x<9; x++) if (g.game_cell(x,0)) return x;
  throw new Error('Could not locate the active column');
}
test('Rust engine checks include matching, cascades and game-over boundaries', async () => {
  const g=await load('game-test.wasm'); assert.doesNotThrow(() => g.game_run_checks());
});
test('release module starts, moves, cycles, drops, and uses next piece', async () => {
  const g=await load('game.wasm'); g.game_start(42);
  assert.equal(g.game_score(),0); assert.equal(g.game_dropped(),0); assert.equal(g.game_over(),0);
  const next=[0,1,2].map(i => g.game_next(i));
  for(let i=0;i<3;i++) g.game_input(0);
  let x=activeColumn(g); const original=[0,1,2].map(y=>g.game_cell(x,y));
  g.game_input(3); assert.deepEqual([0,1,2].map(y=>g.game_cell(x,y)), [original[1],original[2],original[0]]);
  g.game_input(4); assert.deepEqual([0,1,2].map(y=>g.game_cell(x,y)), original);
  for(let i=0;i<20;i++) g.game_input(1); assert.equal(activeColumn(g),0);
  for(let i=0;i<20;i++) g.game_input(2); assert.equal(activeColumn(g),8);
  g.game_input(5); assert.equal(g.game_dropped(),1);
  for(let i=0;i<3;i++) g.game_input(0);
  x=activeColumn(g); assert.deepEqual([0,1,2].map(y=>g.game_cell(x,y)),next);
  assert.equal(g.game_cell(9,0),0); assert.equal(g.game_cell(0,18),0);
});
test('stacking columns eventually ends the game and ignores later input', async () => {
  const g=await load('game.wasm'); g.game_start(123);
  for(let i=0;i<1000 && !g.game_over();i++) {
    for(let n=0;n<9;n++) g.game_input(1);
    g.game_input(5);
  }
  assert.equal(g.game_over(),1); const drops=g.game_dropped(); g.game_input(5); assert.equal(g.game_dropped(),drops);
});
