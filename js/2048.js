/**
 * 2048 — VANILLA ENGINE
 * Full Guideline Mechanics, Smooth CSS Slide Transitions, Undo, & Swipe Gestures
 */

(function () {
  'use strict';

  const STORAGE_KEY = '2048-game-state';
  const BEST_KEY = '2048-best-score';

  let grid = [];
  let score = 0;
  let bestScore = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
  let status = 'playing'; // 'playing' | 'won' | 'over' | 'continue'
  let history = [];
  let tileIdCounter = 0;

  // DOM Elements
  let container, tileContainer, scoreEl, bestEl, undoBtn, newBtn;
  let winOverlay, overOverlay, keepGoingBtn, tryAgainWinBtn, tryAgainOverBtn;
  let floatContainer;

  const COLOR_MAP = {
    2: { bg: 'var(--tile-2)', color: 'var(--color-tile-dark)' },
    4: { bg: 'var(--tile-4)', color: 'var(--color-tile-dark)' },
    8: { bg: 'var(--tile-8)', color: 'var(--color-tile-light)' },
    16: { bg: 'var(--tile-16)', color: 'var(--color-tile-light)' },
    32: { bg: 'var(--tile-32)', color: 'var(--color-tile-light)' },
    64: { bg: 'var(--tile-64)', color: 'var(--color-tile-light)' },
    128: { bg: 'var(--tile-128)', color: 'var(--color-tile-light)' },
    256: { bg: 'var(--tile-256)', color: 'var(--color-tile-light)' },
    512: { bg: 'var(--tile-512)', color: 'var(--color-tile-light)' },
    1024: { bg: 'var(--tile-1024)', color: 'var(--color-tile-light)' },
    2048: { bg: 'var(--tile-2048)', color: 'var(--color-tile-light)' },
  };

  function createEmptyGrid() {
    return Array.from({ length: 4 }, () => Array(4).fill(null));
  }

  function getEmptyCells(g) {
    const cells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!g[r][c]) cells.push([r, c]);
      }
    }
    return cells;
  }

  function addRandomTile(g) {
    const empty = getEmptyCells(g);
    if (!empty.length) return false;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    g[r][c] = {
      id: `t-${tileIdCounter++}`,
      value: val,
      r,
      c,
      isNew: true,
      merged: false,
    };
    return true;
  }

  function cloneGrid(g) {
    return g.map(row => row.map(cell => (cell ? { ...cell } : null)));
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ grid, score, status, history }));
      localStorage.setItem(BEST_KEY, String(bestScore));
    } catch {}
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }

  function showScoreFloat(amount) {
    if (!floatContainer || amount <= 0) return;
    const el = document.createElement('div');
    el.className = 'score-float';
    el.textContent = `+${amount}`;
    floatContainer.appendChild(el);
    setTimeout(() => el.remove(), 600);
  }

  function updateScore(newScore) {
    const diff = newScore - score;
    score = newScore;
    if (diff > 0) showScoreFloat(diff);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(BEST_KEY, String(bestScore));
    }
    if (scoreEl) scoreEl.textContent = score;
    if (bestEl) bestEl.textContent = bestScore;
  }

  function render() {
    if (!tileContainer) return;

    // Map existing DOM elements by tile id
    const existing = new Map();
    tileContainer.querySelectorAll('.tile-2048').forEach(el => {
      existing.set(el.dataset.id, el);
    });

    const activeIds = new Set();

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const tile = grid[r][c];
        if (!tile) continue;

        activeIds.add(tile.id);
        let el = existing.get(tile.id);

        const topCalc = `calc(${r * 25}% + ${r * 3.75}px)`;
        const leftCalc = `calc(${c * 25}% + ${c * 3.75}px)`;

        const conf = COLOR_MAP[tile.value] || { bg: 'var(--tile-super)', color: 'var(--color-tile-light)' };
        const fontSize = tile.value >= 1000 ? 'clamp(1.2rem, 4vw, 1.8rem)' : tile.value >= 100 ? 'clamp(1.5rem, 5vw, 2.2rem)' : 'clamp(1.8rem, 6vw, 2.6rem)';

        if (!el) {
          el = document.createElement('div');
          el.className = 'tile-2048' + (tile.isNew ? ' tile-pop' : '');
          el.dataset.id = tile.id;
          tileContainer.appendChild(el);
        } else if (tile.merged) {
          el.className = 'tile-2048 tile-merge';
        }

        el.style.top = topCalc;
        el.style.left = leftCalc;
        el.style.backgroundColor = conf.bg;
        el.style.color = conf.color;
        el.style.fontSize = fontSize;
        el.textContent = tile.value;
      }
    }

    // Clean up unreferenced DOM tiles
    existing.forEach((el, id) => {
      if (!activeIds.has(id)) el.remove();
    });

    // Update UI controls
    if (undoBtn) undoBtn.disabled = history.length === 0;

    // Overlays
    if (winOverlay) winOverlay.hidden = status !== 'won';
    if (overOverlay) overOverlay.hidden = status !== 'over';
  }

  function slideLine(line) {
    let filtered = line.filter(t => t !== null);
    let scoreDelta = 0;
    const res = [];

    for (let i = 0; i < filtered.length; i++) {
      if (i < filtered.length - 1 && filtered[i].value === filtered[i + 1].value) {
        const mergedVal = filtered[i].value * 2;
        scoreDelta += mergedVal;
        res.push({
          id: `t-${tileIdCounter++}`,
          value: mergedVal,
          r: 0,
          c: 0,
          isNew: false,
          merged: true,
        });
        i++; // skip next tile
      } else {
        res.push({
          ...filtered[i],
          isNew: false,
          merged: false,
        });
      }
    }

    while (res.length < 4) res.push(null);
    return { res, scoreDelta };
  }

  function move(direction) {
    if (status === 'won' || status === 'over') return false;

    // Reset merged flags
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c]) {
          grid[r][c].isNew = false;
          grid[r][c].merged = false;
        }
      }
    }

    const prevGrid = cloneGrid(grid);
    const prevScore = score;
    let moved = false;
    let scoreGained = 0;

    for (let i = 0; i < 4; i++) {
      const line = [];
      for (let j = 0; j < 4; j++) {
        if (direction === 'left') line.push(grid[i][j]);
        if (direction === 'right') line.push(grid[i][3 - j]);
        if (direction === 'up') line.push(grid[j][i]);
        if (direction === 'down') line.push(grid[3 - j][i]);
      }

      const { res, scoreDelta } = slideLine(line);
      scoreGained += scoreDelta;

      for (let j = 0; j < 4; j++) {
        let r, c;
        if (direction === 'left') { r = i; c = j; }
        if (direction === 'right') { r = i; c = 3 - j; }
        if (direction === 'up') { r = j; c = i; }
        if (direction === 'down') { r = 3 - j; c = i; }

        if (res[j]) {
          res[j].r = r;
          res[j].c = c;
        }

        const prev = direction === 'left' ? grid[i][j] :
                     direction === 'right' ? grid[i][3 - j] :
                     direction === 'up' ? grid[j][i] :
                     grid[3 - j][i];

        if (!prev || !res[j] || prev.value !== res[j].value || prev.id !== res[j].id) {
          moved = true;
        }

        grid[r][c] = res[j];
      }
    }

    if (moved) {
      history.push({ grid: prevGrid, score: prevScore });
      updateScore(score + scoreGained);
      addRandomTile(grid);

      // Check win
      if (status !== 'continue') {
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (grid[r][c] && grid[r][c].value === 2048) {
              status = 'won';
            }
          }
        }
      }

      // Check game over
      if (status !== 'won' && getEmptyCells(grid).length === 0) {
        let canMove = false;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            const val = grid[r][c].value;
            if (r < 3 && grid[r + 1][c] && grid[r + 1][c].value === val) canMove = true;
            if (c < 3 && grid[r][c + 1] && grid[r][c + 1].value === val) canMove = true;
          }
        }
        if (!canMove) status = 'over';
      }

      save();
      render();
      return true;
    }

    return false;
  }

  function startNewGame() {
    grid = createEmptyGrid();
    score = 0;
    status = 'playing';
    history = [];
    addRandomTile(grid);
    addRandomTile(grid);
    updateScore(0);
    save();
    render();
  }

  function undo() {
    if (!history.length) return;
    const prev = history.pop();
    grid = prev.grid;
    score = prev.score;
    status = 'playing';
    if (scoreEl) scoreEl.textContent = score;
    save();
    render();
  }

  function continueGame() {
    status = 'continue';
    save();
    render();
  }

  // --- Input Handlers ---
  let touchStartX = 0;
  let touchStartY = 0;

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (!touchStartX && !touchStartY) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    touchStartX = 0;
    touchStartY = 0;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 30) {
      if (absDx > absDy) {
        move(dx > 0 ? 'right' : 'left');
      } else {
        move(dy > 0 ? 'down' : 'up');
      }
    }
  }

  function handleKeyDown(e) {
    const view2048 = document.getElementById('view-2048');
    if (!view2048 || !view2048.classList.contains('active')) return;

    let dir = null;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        dir = 'up';
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        dir = 'down';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        dir = 'left';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        dir = 'right';
        break;
      default:
        return;
    }

    e.preventDefault();
    move(dir);
  }

  function init() {
    container = document.querySelector('.container-2048');
    tileContainer = document.getElementById('tile-container-2048');
    scoreEl = document.getElementById('val-2048-score');
    bestEl = document.getElementById('val-2048-best');
    floatContainer = document.getElementById('score-float-container');
    undoBtn = document.getElementById('btn-2048-undo');
    newBtn = document.getElementById('btn-2048-new');

    winOverlay = document.getElementById('overlay-2048-win');
    overOverlay = document.getElementById('overlay-2048-over');
    keepGoingBtn = document.getElementById('btn-2048-keep-going');
    tryAgainWinBtn = document.getElementById('btn-2048-try-again-win');
    tryAgainOverBtn = document.getElementById('btn-2048-try-again-over');

    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (newBtn) newBtn.addEventListener('click', startNewGame);
    if (keepGoingBtn) keepGoingBtn.addEventListener('click', continueGame);
    if (tryAgainWinBtn) tryAgainWinBtn.addEventListener('click', startNewGame);
    if (tryAgainOverBtn) tryAgainOverBtn.addEventListener('click', startNewGame);

    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    window.addEventListener('keydown', handleKeyDown);

    // Initial State
    const saved = load();
    if (saved && saved.grid && saved.grid.length === 4) {
      grid = saved.grid;
      score = saved.score || 0;
      status = saved.status || 'playing';
      history = saved.history || [];
      if (scoreEl) scoreEl.textContent = score;
      if (bestEl) bestEl.textContent = bestScore;
      render();
    } else {
      startNewGame();
    }
  }

  window.game2048 = {
    init,
    startNewGame,
    undo,
    continueGame,
  };
})();
