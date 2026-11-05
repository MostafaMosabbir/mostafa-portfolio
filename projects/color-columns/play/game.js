/* Browser interface for the Rust game. It handles display and input; all
   board state, matching and scores are calculated by game.wasm. */
(() => {
  'use strict';
  const board = document.getElementById('board');
  const boardContext = board.getContext('2d');
  const nextContext = document.getElementById('next').getContext('2d');
  const score = document.getElementById('score');
  const status = document.getElementById('status');
  const start = document.getElementById('start');
  const pause = document.getElementById('pause');
  const buttons = [...document.querySelectorAll('[data-command]')];
  const palette = ['#07110c', '#dc5960', '#65cb83', '#73a6dc', '#d8a362', '#b881d5', '#e1cf79'];
  const marks = ['', '◆', '●', '■', '▲', '✚', '★'];
  let game = null, running = false, started = false, timer = null;

  function tile(ctx, x, y, color, size) {
    ctx.fillStyle = color ? palette[color] : '#0b1911';
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.strokeStyle = color ? '#d8f6df88' : '#1d3828';
    ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
    if (color) {
      ctx.fillStyle = '#07110c'; ctx.font = `${Math.round(size * .48)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(marks[color], x + size / 2, y + size / 2);
    }
  }
  function draw() {
    for (let y = 0; y < 18; y++) for (let x = 0; x < 9; x++) tile(boardContext, x * 40, y * 40, game.game_cell(x, y), 40);
    for (let i = 0; i < 3; i++) tile(nextContext, 0, i * 48, game.game_next(i), 48);
    score.textContent = String(game.game_score());
  }
  function cancelTimer() { if (timer !== null) clearTimeout(timer); timer = null; }
  function schedule() {
    cancelTimer();
    if (!running) return;
    // Original game becomes faster after each nine dropped columns.
    const delay = Math.max(300, 750 - Math.floor(game.game_dropped() / 9) * (1000 / 60));
    timer = setTimeout(() => { game.game_input(0); draw(); checkOver(); schedule(); }, delay);
  }
  function checkOver() {
    if (!game.game_over()) return false;
    running = false; cancelTimer(); pause.disabled = true;
    start.textContent = 'Play again'; status.textContent = `Game over. Final score: ${game.game_score()}.`;
    return true;
  }
  function move(command) {
    if (!running) return;
    game.game_input(command); draw();
    if (checkOver()) return;
    if (command === 5) schedule();
  }
  function togglePause() {
    if (!started || game.game_over()) return;
    running = !running;
    pause.textContent = running ? 'Pause' : 'Resume';
    status.textContent = running ? 'Playing. Focus the board for keyboard controls.' : 'Paused.';
    schedule();
  }
  start.addEventListener('click', () => {
    game.game_start((Math.random() * 0xffffffff) >>> 0);
    started = true; running = true; pause.disabled = false; pause.textContent = 'Pause';
    start.textContent = 'Restart'; status.textContent = 'Playing. Use the board or on-screen controls.';
    draw(); schedule(); board.focus();
  });
  pause.addEventListener('click', () => { togglePause(); board.focus(); });
  buttons.forEach(button => button.addEventListener('click', () => { move(Number(button.dataset.command)); board.focus(); }));
  board.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    const commands = {arrowleft:1, a:1, arrowright:2, d:2, arrowup:3, w:3, arrowdown:4, s:4, ' ':5};
    if (Object.hasOwn(commands, key)) { event.preventDefault(); move(commands[key]); }
    else if (key === 'p') { event.preventDefault(); togglePause(); }
    else if (key === 'escape') { event.preventDefault(); requestExit(); }
  });
  function requestExit() {
    running = false; cancelTimer();
    if (window.parent !== window) window.parent.postMessage({type:'color-columns:exit'}, window.location.origin);
    else { status.textContent = 'Game stopped. You can start again or close this tab.'; pause.disabled = true; }
  }
  document.getElementById('exit').addEventListener('click', requestExit);
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) togglePause(); });

  // This explicitly reports a missing or incompatible build instead of
  // presenting an empty placeholder as if it were a playable game.
  fetch('game.wasm').then(response => {
    if (!response.ok) throw new Error('Game file unavailable');
    return response.arrayBuffer();
  }).then(bytes => WebAssembly.instantiate(bytes, {})).then(result => {
    game = result.instance.exports; start.disabled = false; status.textContent = 'Ready. Select Start game to play.';
  }).catch(() => { status.textContent = 'The game could not load. Please try again later.'; });
})();
