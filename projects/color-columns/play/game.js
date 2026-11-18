/* Browser interface for the Rust game. It handles display and input; all
   board state, matching and scores are calculated by game.wasm. */
(() => {
  'use strict';
  const board = document.getElementById('board');
  const boardContext = board.getContext('2d');
  const stage = document.getElementById('board-stage');
  const robot = document.getElementById('game-robot');
  const lasers = document.getElementById('laser-overlay');
  const laserContext = lasers.getContext('2d');
  const nextContext = document.getElementById('next').getContext('2d');
  const score = document.getElementById('score');
  const status = document.getElementById('status');
  const start = document.getElementById('start');
  const pause = document.getElementById('pause');
  const playerName = document.getElementById('player-name');
  const scores = document.getElementById('leaderboard-scores');
  const emptyScores = document.getElementById('leaderboard-empty');
  const previewWasm = document.getElementById('preview-wasm');
  const leaderboard = window.ColorColumnsLeaderboard.create();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const buttons = [...document.querySelectorAll('[data-command]')];
  const columns = 9, rows = 18, tileSize = 40;
  const palette = ['#07110c', '#dc5960', '#65cb83', '#73a6dc', '#d8a362', '#b881d5', '#e1cf79'];
  const marks = ['', '◆', '●', '■', '▲', '✚', '★'];
  let game = null, running = false, started = false, timer = null;
  let roundName = '', clearFrame = null;
  let previewSeed = previewWasm?.dataset.seed;

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
  function drawBoard(cell = game.game_cell) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) tile(boardContext, x * tileSize, y * tileSize, cell(x, y), tileSize);
    }
  }
  function drawStats() {
    for (let i = 0; i < 3; i++) tile(nextContext, 0, i * 48, game.game_next(i), 48);
    score.textContent = String(game.game_score());
  }
  function drawScores(entries) {
    scores.replaceChildren(...entries.map(({ name, score }) => {
      const row = document.createElement('li');
      const content = document.createElement('span');
      const player = document.createElement('span');
      const value = document.createElement('strong');
      player.textContent = name;
      value.textContent = String(score);
      content.append(player, value);
      row.append(content);
      return row;
    }));
    scores.hidden = entries.length === 0;
    emptyScores.hidden = entries.length > 0;
  }

  // Copy the snapshots and targets before the next Rust input resets them.
  function readClearWaves() {
    const waves = [];
    for (let i = 0, count = game.game_clear_count(); i < count; i++) {
      const wave = game.game_clear_wave(i);
      waves[wave] ??= {
        cells: Array.from({ length: rows * columns }, (_, index) =>
          game.game_clear_stage_cell(wave, index % columns, Math.floor(index / columns))),
        targets: []
      };
      waves[wave].targets.push({ x: game.game_clear_x(i), y: game.game_clear_y(i), color: game.game_clear_color(i) });
    }
    return waves;
  }
  function drawBeams(targets, progress) {
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const stageBox = stage.getBoundingClientRect();
    const boardBox = board.getBoundingClientRect();
    const robotBox = robot.getBoundingClientRect();
    const width = Math.round(stageBox.width * scale);
    const height = Math.round(stageBox.height * scale);
    if (lasers.width !== width || lasers.height !== height) {
      lasers.width = width;
      lasers.height = height;
    }
    laserContext.setTransform(scale, 0, 0, scale, 0, 0);
    laserContext.clearRect(0, 0, stageBox.width, stageBox.height);

    const sourceX = robotBox.left - stageBox.left;
    const sourceY = robotBox.top - stageBox.top;
    const cellWidth = board.clientWidth / columns;
    const cellHeight = board.clientHeight / rows;
    const targetPoints = targets.map(({ x, y, color }) => ({
      x: boardBox.left - stageBox.left + board.clientLeft + (x + .5) * cellWidth,
      y: boardBox.top - stageBox.top + board.clientTop + (y + .5) * cellHeight,
      color
    }));
    const intensity = Math.min(1, progress * 12, (1 - progress) * 3.5);
    const reach = Math.min(1, progress * 5);
    laserContext.lineCap = 'round';
    laserContext.beginPath();
    for (const target of targetPoints) {
      laserContext.moveTo(sourceX, sourceY);
      laserContext.lineTo(sourceX + (target.x - sourceX) * reach, sourceY + (target.y - sourceY) * reach);
    }
    laserContext.globalAlpha = intensity * .52;
    laserContext.strokeStyle = '#24d994';
    laserContext.lineWidth = 5;
    laserContext.stroke();
    laserContext.globalAlpha = intensity;
    laserContext.strokeStyle = '#d7ffe9';
    laserContext.lineWidth = 1.4;
    laserContext.stroke();

    const impact = Math.max(0, (progress - .25) / .75);
    laserContext.globalAlpha = 1 - impact;
    if (impact > 0) for (const { x, y, color } of targetPoints) {
      laserContext.fillStyle = palette[color];
      const distance = (3 + impact * 13) * cellWidth / 22;
      for (const [dx, dy] of [[-1, -.65], [1, -.5], [.85, .8], [-.7, .9]]) {
        laserContext.fillRect(x + dx * distance, y + dy * distance, 2.3, 2.3);
      }
    }
    laserContext.globalAlpha = 1;
  }
  function stopClear() {
    if (clearFrame === null) return;
    window.cancelAnimationFrame(clearFrame);
    clearFrame = null;
    robot.classList.remove('is-firing');
    laserContext.clearRect(0, 0, lasers.width, lasers.height);
    drawBoard();
  }
  function animateClear(waves) {
    stopClear();
    robot.classList.add('is-firing');
    const duration = Math.min(175, 460 / waves.length);
    let beganAt, displayedBoard;
    function renderFrame(now) {
      beganAt ??= now;
      const elapsed = (now - beganAt) / duration;
      const currentWave = Math.floor(elapsed);
      if (currentWave >= waves.length) {
        stopClear();
        return;
      }
      const progress = elapsed - currentWave;
      const boardWave = currentWave + (progress >= .52 ? 1 : 0);
      if (displayedBoard !== boardWave) {
        const snapshot = waves[boardWave];
        if (snapshot) drawBoard((x, y) => snapshot.cells[y * columns + x]);
        else drawBoard();
        displayedBoard = boardWave;
      }
      drawBeams(waves[currentWave].targets, progress);
      clearFrame = window.requestAnimationFrame(renderFrame);
    }
    drawBoard((x, y) => waves[0].cells[y * columns + x]);
    displayedBoard = 0;
    clearFrame = window.requestAnimationFrame(renderFrame);
  }
  function applyInput(command) {
    game.game_input(command);
    drawStats();
    if (!reducedMotion.matches && game.game_clear_count() > 0) animateClear(readClearWaves());
    else if (clearFrame === null) drawBoard();
  }
  function cancelTimer() { if (timer !== null) clearTimeout(timer); timer = null; }
  function schedule() {
    cancelTimer();
    if (!running) return;
    // Original game becomes faster after each nine dropped columns.
    const delay = Math.max(300, 750 - Math.floor(game.game_dropped() / 9) * (1000 / 60));
    timer = setTimeout(() => { applyInput(0); checkOver(); schedule(); }, delay);
  }
  function checkOver() {
    if (!game.game_over()) return false;
    running = false; cancelTimer(); pause.disabled = true; playerName.disabled = false;
    const finalScore = game.game_score();
    drawScores(leaderboard.record(roundName, finalScore));
    start.textContent = 'Play again'; status.textContent = `Game over. Final score: ${finalScore}.`;
    return true;
  }
  function move(command) {
    if (!running) return;
    applyInput(command);
    if (checkOver()) return;
    if (command === 5) schedule();
  }
  function togglePause() {
    if (!started || game.game_over()) return;
    running = !running;
    if (!running) stopClear();
    pause.textContent = running ? 'Pause' : 'Resume';
    status.textContent = running ? 'Playing. Focus the board for keyboard controls.' : 'Paused.';
    schedule();
  }
  start.addEventListener('click', () => {
    stopClear();
    const seed = previewSeed === undefined ? (Math.random() * 0xffffffff) >>> 0 : Number(previewSeed);
    previewSeed = undefined;
    game.game_start(seed);
    roundName = playerName.value;
    playerName.disabled = true;
    started = true; running = true; pause.disabled = false; pause.textContent = 'Pause';
    start.textContent = 'Restart'; status.textContent = 'Playing. Use the buttons or focus the board.';
    drawBoard(); drawStats(); schedule(); board.focus();
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
    running = false; started = false; cancelTimer(); stopClear(); playerName.disabled = false;
    if (window.parent !== window) window.parent.postMessage({type:'color-columns:exit'}, window.location.origin);
    else {
      status.textContent = 'Game stopped. You can start again or close this tab.';
      start.textContent = 'Start game'; pause.disabled = true;
    }
  }
  document.getElementById('exit').addEventListener('click', requestExit);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (running) togglePause();
    else stopClear();
  });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stopClear(); });
  drawScores(leaderboard.read());

  // This explicitly reports a missing or incompatible build instead of
  // presenting an empty placeholder as if it were a playable game.
  async function loadWasm() {
    if (previewWasm) return Uint8Array.from(atob(previewWasm.textContent.trim()), character => character.charCodeAt(0));
    const response = await fetch('game.wasm?v=visor-1');
    if (!response.ok) throw new Error('Game file unavailable');
    return response.arrayBuffer();
  }
  loadWasm().then(bytes => WebAssembly.instantiate(bytes, {})).then(result => {
    game = result.instance.exports; start.disabled = false; status.textContent = 'Ready. Select Start game to play.';
  }).catch(() => { status.textContent = 'The game could not load. Please try again later.'; });
})();
