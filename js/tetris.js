/**
 * TETRIS STUDIO — CORE GAME ENGINE
 * Features:
 * - SRS (Super Rotation System) with wall & floor kicks
 * - 7-Bag Randomizer
 * - Hold Piece & 3-Piece Next Queue
 * - Ghost Piece Projection
 * - Lock Delay with move-reset limit
 * - High-speed DAS/ARR handling for fluid keyboard control
 * - Particle engine & screen shake
 * - High-DPI canvas rendering with tactile beveled blocks
 */

(function () {
  'use strict';

  // --- Board Constants ---
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 30; // 300x600 canvas
  const PREVIEW_BLOCK_SIZE = 20;

  // --- Piece Definitions & Aesthetics ---
  // Palette: Vibrant modern neon with slight pastel undertone for elegance
  const PIECE_CONFIG = {
    I: {
      color: '#06b6d4', // Cyan
      glow: 'rgba(6, 182, 212, 0.45)',
      matrices: [
        [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
        [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
        [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
        [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]]
      ]
    },
    J: {
      color: '#3b82f6', // Blue
      glow: 'rgba(59, 130, 246, 0.45)',
      matrices: [
        [[1,0,0], [1,1,1], [0,0,0]],
        [[0,1,1], [0,1,0], [0,1,0]],
        [[0,0,0], [1,1,1], [0,0,1]],
        [[0,1,0], [0,1,0], [1,1,0]]
      ]
    },
    L: {
      color: '#f97316', // Orange
      glow: 'rgba(249, 115, 22, 0.45)',
      matrices: [
        [[0,0,1], [1,1,1], [0,0,0]],
        [[0,1,0], [0,1,0], [0,1,1]],
        [[0,0,0], [1,1,1], [1,0,0]],
        [[1,1,0], [0,1,0], [0,1,0]]
      ]
    },
    O: {
      color: '#eab308', // Yellow
      glow: 'rgba(234, 179, 8, 0.45)',
      matrices: [
        [[1,1], [1,1]]
      ]
    },
    S: {
      color: '#10b981', // Emerald
      glow: 'rgba(16, 185, 129, 0.45)',
      matrices: [
        [[0,1,1], [1,1,0], [0,0,0]],
        [[0,1,0], [0,1,1], [0,0,1]],
        [[0,0,0], [0,1,1], [1,1,0]],
        [[1,0,0], [1,1,0], [0,1,0]]
      ]
    },
    T: {
      color: '#a855f7', // Purple
      glow: 'rgba(168, 85, 247, 0.45)',
      matrices: [
        [[0,1,0], [1,1,1], [0,0,0]],
        [[0,1,0], [0,1,1], [0,1,0]],
        [[0,0,0], [1,1,1], [0,1,0]],
        [[0,1,0], [1,1,0], [0,1,0]]
      ]
    },
    Z: {
      color: '#ef4444', // Red
      glow: 'rgba(239, 68, 68, 0.45)',
      matrices: [
        [[1,1,0], [0,1,1], [0,0,0]],
        [[0,0,1], [0,1,1], [0,1,0]],
        [[0,0,0], [1,1,0], [0,1,1]],
        [[0,1,0], [1,1,0], [1,0,0]]
      ]
    }
  };

  const PIECE_TYPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

  // --- SRS Wall Kick Offsets (Guideline Standard) ---
  // [dx, dy] where dy is screen-down (negative math Y is positive canvas Y)
  const WALLKICKS_JLSTZ = {
    '0->1': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    '1->0': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    '1->2': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    '2->1': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    '2->3': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    '3->2': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    '3->0': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    '0->3': [[0,0], [1,0], [1,-1], [0,2], [1,2]]
  };

  const WALLKICKS_I = {
    '0->1': [[0,0], [-2,0], [1,0], [-2,1], [1,-2]],
    '1->0': [[0,0], [2,0], [-1,0], [2,-1], [-1,2]],
    '1->2': [[0,0], [-1,0], [2,0], [-1,-2], [2,1]],
    '2->1': [[0,0], [1,0], [-2,0], [1,2], [-2,-1]],
    '2->3': [[0,0], [2,0], [-1,0], [2,-1], [-1,2]],
    '3->2': [[0,0], [-2,0], [1,0], [-2,1], [1,-2]],
    '3->0': [[0,0], [1,0], [-2,0], [1,2], [-2,-1]],
    '0->3': [[0,0], [-1,0], [2,0], [-1,-2], [2,1]]
  };

  // --- Game State Variables ---
  let board = createMatrix(ROWS, COLS);
  let bag = [];
  let nextQueue = [];
  let currentPiece = null;
  let holdPiece = null;
  let canHold = true;

  let score = 0;
  let lines = 0;
  let level = 1;
  let combo = -1;
  let highScore = parseInt(localStorage.getItem('tetris_high_score') || '0', 10);

  let isGameOver = false;
  let isPaused = false;
  let dropInterval = 1000;
  let lastDropTime = 0;
  let lockTimer = 0;
  const LOCK_DELAY = 500;
  let lockResets = 0;
  const MAX_LOCK_RESETS = 15;

  let clearingRows = [];
  let clearTimer = 0;
  const CLEAR_ANIM_DURATION = 180; // ms

  let particles = [];
  let animationFrameId = null;

  // Key Auto-Repeat (DAS / ARR)
  const keyState = {};
  const DAS = 140; // Initial delay in ms
  const ARR = 32;  // Repeat rate in ms

  // DOM Elements
  const canvas = document.getElementById('tetris-canvas');
  const ctx = canvas.getContext('2d');
  const holdCanvas = document.getElementById('hold-canvas');
  const holdCtx = holdCanvas.getContext('2d');
  const nextCanvas = document.getElementById('next-canvas');
  const nextCtx = nextCanvas.getContext('2d');

  const boardFrame = document.getElementById('board-frame');
  const scoreDisplay = document.getElementById('score-display');
  const highScoreDisplay = document.getElementById('high-score-display');
  const levelDisplay = document.getElementById('level-display');
  const linesDisplay = document.getElementById('lines-display');

  const pauseOverlay = document.getElementById('pause-overlay');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const finalScoreEl = document.getElementById('final-score');
  const finalLinesEl = document.getElementById('final-lines');

  const btnSound = document.getElementById('btn-sound');
  const iconSoundOn = document.getElementById('icon-sound-on');
  const iconSoundOff = document.getElementById('icon-sound-off');
  const btnPauseHeader = document.getElementById('btn-pause-header');
  const btnResume = document.getElementById('btn-resume');
  const btnRestartPause = document.getElementById('btn-restart-pause');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnHelp = document.getElementById('btn-help');
  const helpModal = document.getElementById('help-modal');
  const btnCloseHelp = document.getElementById('btn-close-help');

  // --- Helper Functions ---
  function createMatrix(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
  }

  function getGravityDelay(lvl) {
    // Standard guideline progression formula
    const d = Math.pow(0.8 - ((lvl - 1) * 0.007), lvl - 1) * 1000;
    return Math.max(70, Math.floor(d));
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function refillBag() {
    bag = shuffle([...PIECE_TYPES]);
  }

  function popFromQueue() {
    while (nextQueue.length < 5) {
      if (bag.length === 0) refillBag();
      nextQueue.push(bag.pop());
    }
    return nextQueue.shift();
  }

  function spawnPiece() {
    const type = popFromQueue();
    const config = PIECE_CONFIG[type];
    const matrix = config.matrices[0];
    const x = Math.floor((COLS - matrix[0].length) / 2);
    const y = type === 'I' ? -1 : 0;

    currentPiece = {
      type,
      matrix,
      rot: 0,
      x,
      y
    };

    canHold = true;
    lockTimer = 0;
    lockResets = 0;

    // Check immediate collision -> Game Over
    if (collides(board, currentPiece)) {
      triggerGameOver();
    }
  }

  function collides(targetBoard, piece) {
    const m = piece.matrix;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (m[r][c] !== 0) {
          const bx = piece.x + c;
          const by = piece.y + r;
          if (bx < 0 || bx >= COLS || by >= ROWS) {
            return true;
          }
          if (by >= 0 && targetBoard[by][bx] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // --- Ghost Piece Projection ---
  function getGhostPiece() {
    if (!currentPiece) return null;
    const ghost = {
      type: currentPiece.type,
      matrix: currentPiece.matrix,
      rot: currentPiece.rot,
      x: currentPiece.x,
      y: currentPiece.y
    };
    while (!collides(board, { ...ghost, y: ghost.y + 1 })) {
      ghost.y++;
    }
    return ghost;
  }

  // --- Rotations & SRS Kicks ---
  function rotatePiece(direction) {
    if (!currentPiece || currentPiece.type === 'O') return;
    const type = currentPiece.type;
    const matrices = PIECE_CONFIG[type].matrices;
    const currentRot = currentPiece.rot;
    const nextRot = (currentRot + direction + 4) % 4;
    const nextMatrix = matrices[nextRot];

    const kickKey = `${currentRot}->${nextRot}`;
    const kickTable = type === 'I' ? WALLKICKS_I[kickKey] : WALLKICKS_JLSTZ[kickKey];

    if (!kickTable) return;

    for (let i = 0; i < kickTable.length; i++) {
      const [kx, ky] = kickTable[i];
      const testPiece = {
        type,
        matrix: nextMatrix,
        rot: nextRot,
        x: currentPiece.x + kx,
        y: currentPiece.y - ky // SRS math uses up as +y, canvas uses down as +y
      };

      if (!collides(board, testPiece)) {
        currentPiece.matrix = nextMatrix;
        currentPiece.rot = nextRot;
        currentPiece.x = testPiece.x;
        currentPiece.y = testPiece.y;

        if (lockResets < MAX_LOCK_RESETS) {
          lockTimer = 0;
          lockResets++;
        }
        window.soundEngine.playRotate();
        return;
      }
    }
  }

  // --- Piece Movements ---
  function moveHorizontal(dir) {
    if (!currentPiece || isGameOver || isPaused || clearingRows.length > 0) return;
    const test = { ...currentPiece, x: currentPiece.x + dir };
    if (!collides(board, test)) {
      currentPiece.x += dir;
      if (lockResets < MAX_LOCK_RESETS) {
        lockTimer = 0;
        lockResets++;
      }
      window.soundEngine.playMove();
    }
  }

  function moveDown() {
    if (!currentPiece || isGameOver || isPaused || clearingRows.length > 0) return false;
    const test = { ...currentPiece, y: currentPiece.y + 1 };
    if (!collides(board, test)) {
      currentPiece.y++;
      score += 1; // Soft drop bonus
      updateUI();
      return true;
    }
    return false;
  }

  function hardDrop() {
    if (!currentPiece || isGameOver || isPaused || clearingRows.length > 0) return;
    let dropCells = 0;
    while (!collides(board, { ...currentPiece, y: currentPiece.y + 1 })) {
      currentPiece.y++;
      dropCells++;
    }
    score += dropCells * 2;
    window.soundEngine.playHardDrop();
    shakeBoard(false);
    spawnDropParticles(currentPiece);
    lockPiece();
    updateUI();
  }

  function holdCurrentPiece() {
    if (!canHold || isGameOver || isPaused || clearingRows.length > 0) return;
    window.soundEngine.playHold();
    canHold = false;
    const currentType = currentPiece.type;

    if (holdPiece === null) {
      holdPiece = currentType;
      spawnPiece();
    } else {
      const prevHold = holdPiece;
      holdPiece = currentType;
      const config = PIECE_CONFIG[prevHold];
      currentPiece = {
        type: prevHold,
        matrix: config.matrices[0],
        rot: 0,
        x: Math.floor((COLS - config.matrices[0][0].length) / 2),
        y: prevHold === 'I' ? -1 : 0
      };
      lockTimer = 0;
      lockResets = 0;
    }
    renderHold();
  }

  // --- Lock and Clear ---
  function lockPiece() {
    if (!currentPiece) return;
    const m = currentPiece.matrix;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (m[r][c] !== 0) {
          const by = currentPiece.y + r;
          const bx = currentPiece.x + c;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            board[by][bx] = currentPiece.type;
          }
        }
      }
    }
    window.soundEngine.playLock();
    currentPiece = null;
    checkLineClears();
  }

  function checkLineClears() {
    clearingRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every(cell => cell !== 0)) {
        clearingRows.push(r);
      }
    }

    if (clearingRows.length > 0) {
      clearTimer = performance.now();
      window.soundEngine.playClear(clearingRows.length);
      if (clearingRows.length === 4) {
        shakeBoard(true);
      }
      spawnClearParticles(clearingRows);
    } else {
      combo = -1;
      spawnPiece();
      renderNext();
    }
  }

  function finalizeLineClears() {
    const numLines = clearingRows.length;
    combo++;

    // Guideline scoring base: 100, 300, 500, 800 * level
    const linePoints = { 1: 100, 2: 300, 3: 500, 4: 800 }[numLines] || 0;
    score += (linePoints * level) + (combo > 0 ? combo * 50 * level : 0);

    // Filter board rows
    const remainingRows = board.filter((_, idx) => !clearingRows.includes(idx));
    const newEmptyRows = Array.from({ length: numLines }, () => Array(COLS).fill(0));
    board = [...newEmptyRows, ...remainingRows];

    lines += numLines;
    level = Math.floor(lines / 10) + 1;
    dropInterval = getGravityDelay(level);

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('tetris_high_score', highScore.toString());
    }

    clearingRows = [];
    updateUI();
    spawnPiece();
    renderNext();
  }

  // --- Visual Effects & Particles ---
  function shakeBoard(isHeavy) {
    boardFrame.classList.remove('shake-light', 'shake-heavy');
    void boardFrame.offsetWidth; // Reflow trigger
    boardFrame.classList.add(isHeavy ? 'shake-heavy' : 'shake-light');
    setTimeout(() => {
      boardFrame.classList.remove('shake-light', 'shake-heavy');
    }, isHeavy ? 300 : 200);
  }

  function spawnClearParticles(rowsToClear) {
    rowsToClear.forEach(r => {
      const y = r * BLOCK_SIZE + (BLOCK_SIZE / 2);
      for (let c = 0; c < COLS; c++) {
        const type = board[r][c];
        const color = (PIECE_CONFIG[type] && PIECE_CONFIG[type].color) || '#fff';
        const x = c * BLOCK_SIZE + (BLOCK_SIZE / 2);

        for (let i = 0; i < 4; i++) {
          particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 2,
            size: Math.random() * 3 + 2,
            color,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.02
          });
        }
      }
    });
  }

  function spawnDropParticles(piece) {
    const m = piece.matrix;
    const color = PIECE_CONFIG[piece.type].color;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (m[r][c] !== 0) {
          const x = (piece.x + c) * BLOCK_SIZE + (BLOCK_SIZE / 2);
          const y = (piece.y + r + 1) * BLOCK_SIZE;
          particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 2 - 0.5,
            size: Math.random() * 2.5 + 1.5,
            color,
            alpha: 0.8,
            decay: 0.04
          });
        }
      }
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // --- Rendering Routines ---
  function drawBlock(context, x, y, size, color, isGhost = false, isBeveled = true) {
    const pad = 1.5;
    const r = 4; // Corner radius
    const bx = x + pad;
    const by = y + pad;
    const bSize = size - pad * 2;

    context.save();

    if (isGhost) {
      context.strokeStyle = color;
      context.lineWidth = 1.5;
      context.fillStyle = 'rgba(255, 255, 255, 0.04)';
      roundRect(context, bx, by, bSize, bSize, r);
      context.fill();
      context.stroke();
      context.restore();
      return;
    }

    // Outer rounded block
    roundRect(context, bx, by, bSize, bSize, r);
    context.fillStyle = color;
    context.fill();

    if (isBeveled) {
      // Top specular highlight
      const grad = context.createLinearGradient(bx, by, bx, by + bSize);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      context.fillStyle = grad;
      roundRect(context, bx, by, bSize, bSize, r);
      context.fill();

      // Subtle inner rim
      context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      context.lineWidth = 1;
      context.stroke();
    }

    context.restore();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawGrid(context) {
    context.save();
    context.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    context.lineWidth = 1;

    for (let c = 1; c < COLS; c++) {
      context.beginPath();
      context.moveTo(c * BLOCK_SIZE, 0);
      context.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      context.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      context.beginPath();
      context.moveTo(0, r * BLOCK_SIZE);
      context.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
      context.stroke();
    }
    context.restore();
  }

  function renderBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx);

    // Draw settled cells
    for (let r = 0; r < ROWS; r++) {
      if (clearingRows.includes(r)) {
        // Line clear flash animation
        const elapsed = performance.now() - clearTimer;
        const progress = Math.min(1, elapsed / CLEAR_ANIM_DURATION);
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress * 0.8})`;
        ctx.fillRect(0, r * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
        continue;
      }

      for (let c = 0; c < COLS; c++) {
        const type = board[r][c];
        if (type !== 0) {
          const color = PIECE_CONFIG[type].color;
          drawBlock(ctx, c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, color);
        }
      }
    }

    // Draw ghost piece
    if (currentPiece && clearingRows.length === 0) {
      const ghost = getGhostPiece();
      if (ghost && ghost.y !== currentPiece.y) {
        const gm = ghost.matrix;
        const color = PIECE_CONFIG[ghost.type].color;
        for (let r = 0; r < gm.length; r++) {
          for (let c = 0; c < gm[r].length; c++) {
            if (gm[r][c] !== 0) {
              const gy = (ghost.y + r) * BLOCK_SIZE;
              const gx = (ghost.x + c) * BLOCK_SIZE;
              if (ghost.y + r >= 0) {
                drawBlock(ctx, gx, gy, BLOCK_SIZE, color, true);
              }
            }
          }
        }
      }

      // Draw active falling piece
      const m = currentPiece.matrix;
      const color = PIECE_CONFIG[currentPiece.type].color;
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
          if (m[r][c] !== 0) {
            const py = (currentPiece.y + r) * BLOCK_SIZE;
            const px = (currentPiece.x + c) * BLOCK_SIZE;
            if (currentPiece.y + r >= 0) {
              drawBlock(ctx, px, py, BLOCK_SIZE, color);
            }
          }
        }
      }
    }

    // Render particles
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function renderHold() {
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (!holdPiece) return;

    const config = PIECE_CONFIG[holdPiece];
    const m = config.matrices[0];
    const pieceWidth = m[0].length * PREVIEW_BLOCK_SIZE;
    const pieceHeight = m.length * PREVIEW_BLOCK_SIZE;
    const ox = (holdCanvas.width - pieceWidth) / 2;
    const oy = (holdCanvas.height - pieceHeight) / 2;

    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (m[r][c] !== 0) {
          drawBlock(
            holdCtx,
            ox + c * PREVIEW_BLOCK_SIZE,
            oy + r * PREVIEW_BLOCK_SIZE,
            PREVIEW_BLOCK_SIZE,
            canHold ? config.color : '#64748b'
          );
        }
      }
    }
  }

  function renderNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const count = 3;
    const slotHeight = nextCanvas.height / count;

    for (let i = 0; i < count; i++) {
      const type = nextQueue[i];
      if (!type) continue;

      const config = PIECE_CONFIG[type];
      const m = config.matrices[0];
      const pieceWidth = m[0].length * PREVIEW_BLOCK_SIZE;
      const pieceHeight = m.length * PREVIEW_BLOCK_SIZE;
      const ox = (nextCanvas.width - pieceWidth) / 2;
      const oy = i * slotHeight + (slotHeight - pieceHeight) / 2;

      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
          if (m[r][c] !== 0) {
            drawBlock(
              nextCtx,
              ox + c * PREVIEW_BLOCK_SIZE,
              oy + r * PREVIEW_BLOCK_SIZE,
              PREVIEW_BLOCK_SIZE,
              config.color
            );
          }
        }
      }
    }
  }

  function updateUI() {
    scoreDisplay.textContent = score.toLocaleString();
    highScoreDisplay.textContent = highScore.toLocaleString();
    levelDisplay.textContent = level;
    linesDisplay.textContent = lines;
  }

  // --- Game Loop ---
  function update(now = 0) {
    if (isGameOver || isPaused) return;

    updateParticles();

    // Check if line clearing animation is in progress
    if (clearingRows.length > 0) {
      if (now - clearTimer >= CLEAR_ANIM_DURATION) {
        finalizeLineClears();
      }
      renderBoard();
      animationFrameId = requestAnimationFrame(update);
      return;
    }

    // Handle DAS / ARR keys
    handleKeyRepeats(now);

    // Handle Gravity & Lock Delay
    if (!lastDropTime) lastDropTime = now;
    const delta = now - lastDropTime;

    if (currentPiece) {
      const isTouchingFloor = collides(board, { ...currentPiece, y: currentPiece.y + 1 });

      if (isTouchingFloor) {
        if (!lockTimer) {
          lockTimer = now;
        } else if (now - lockTimer >= LOCK_DELAY) {
          lockPiece();
          lastDropTime = now;
        }
      } else {
        lockTimer = 0;
        if (delta >= dropInterval) {
          currentPiece.y++;
          lastDropTime = now;
        }
      }
    }

    renderBoard();
    animationFrameId = requestAnimationFrame(update);
  }

  // --- Keyboard & DAS / ARR System ---
  function handleKeyRepeats(now) {
    ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].forEach(key => {
      const state = keyState[key];
      if (state && state.down) {
        const elapsed = now - state.startTime;
        if (elapsed > DAS) {
          if (now - state.lastRepeat >= ARR) {
            const dir = (key === 'ArrowLeft' || key === 'KeyA') ? -1 : 1;
            moveHorizontal(dir);
            state.lastRepeat = now;
          }
        }
      }
    });

    ['ArrowDown', 'KeyS'].forEach(key => {
      const state = keyState[key];
      if (state && state.down) {
        if (now - state.lastRepeat >= 45) {
          moveDown();
          state.lastRepeat = now;
        }
      }
    });
  }

  function setupInput() {
    window.addEventListener('keydown', e => {
      const tetrisView = document.getElementById('view-tetris');
      if (!tetrisView || !tetrisView.classList.contains('active')) return;

      window.soundEngine.init();

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (isGameOver) {
        if (e.code === 'Enter' || e.code === 'Space') {
          startNewGame();
        }
        return;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        togglePause();
        return;
      }

      if (isPaused) return;

      if (e.code === 'KeyM') {
        toggleMute();
        return;
      }

      if (e.code === 'KeyC' || e.shiftKey) {
        holdCurrentPiece();
        return;
      }

      if (e.code === 'Space') {
        hardDrop();
        return;
      }

      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyX') {
        rotatePiece(1); // Clockwise
        return;
      }

      if (e.code === 'KeyZ' || e.ctrlKey) {
        rotatePiece(-1); // Counter-Clockwise
        return;
      }

      // Horizontal Moves
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (!keyState[e.code] || !keyState[e.code].down) {
          moveHorizontal(-1);
          keyState[e.code] = { down: true, startTime: performance.now(), lastRepeat: performance.now() };
        }
        return;
      }

      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (!keyState[e.code] || !keyState[e.code].down) {
          moveHorizontal(1);
          keyState[e.code] = { down: true, startTime: performance.now(), lastRepeat: performance.now() };
        }
        return;
      }

      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        if (!keyState[e.code] || !keyState[e.code].down) {
          moveDown();
          keyState[e.code] = { down: true, startTime: performance.now(), lastRepeat: performance.now() };
        }
        return;
      }
    });

    window.addEventListener('keyup', e => {
      if (keyState[e.code]) {
        keyState[e.code].down = false;
      }
    });

    // Mobile / Touch Bindings
    setupTouchButton('t-left', () => moveHorizontal(-1));
    setupTouchButton('t-right', () => moveHorizontal(1));
    setupTouchButton('t-down', () => moveDown());
    setupTouchButton('t-rot-cw', () => rotatePiece(1));
    setupTouchButton('t-rot-ccw', () => rotatePiece(-1));
    setupTouchButton('t-hard', () => hardDrop());
    setupTouchButton('t-hold', () => holdCurrentPiece());
  }

  function setupTouchButton(id, action) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      window.soundEngine.init();
      action();
    });
    el.addEventListener('click', e => {
      e.preventDefault();
      window.soundEngine.init();
      action();
    });
  }

  // --- Control Actions ---
  function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
      pauseOverlay.classList.remove('hidden');
    } else {
      pauseOverlay.classList.add('hidden');
      lastDropTime = performance.now();
      requestAnimationFrame(update);
    }
  }

  function toggleMute() {
    const muted = window.soundEngine.toggleMute();
    iconSoundOn.classList.toggle('hidden', muted);
    iconSoundOff.classList.toggle('hidden', !muted);
  }

  function triggerGameOver() {
    isGameOver = true;
    window.soundEngine.playGameOver();
    finalScoreEl.textContent = score.toLocaleString();
    finalLinesEl.textContent = lines;
    gameoverOverlay.classList.remove('hidden');
  }

  function startNewGame() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    board = createMatrix(ROWS, COLS);
    bag = [];
    nextQueue = [];
    currentPiece = null;
    holdPiece = null;
    canHold = true;
    score = 0;
    lines = 0;
    level = 1;
    combo = -1;
    isGameOver = false;
    isPaused = false;
    dropInterval = getGravityDelay(1);
    particles = [];
    clearingRows = [];

    pauseOverlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');

    refillBag();
    for (let i = 0; i < 5; i++) {
      if (bag.length === 0) refillBag();
      nextQueue.push(bag.pop());
    }

    spawnPiece();
    renderHold();
    renderNext();
    updateUI();

    lastDropTime = performance.now();
    requestAnimationFrame(update);
  }

  // --- Setup Event Listeners ---
  function init() {
    btnSound.addEventListener('click', () => {
      window.soundEngine.init();
      toggleMute();
    });

    btnPauseHeader.addEventListener('click', togglePause);
    btnResume.addEventListener('click', togglePause);
    btnRestartPause.addEventListener('click', startNewGame);
    btnPlayAgain.addEventListener('click', startNewGame);

    btnHelp.addEventListener('click', () => {
      helpModal.showModal();
    });

    btnCloseHelp.addEventListener('click', () => {
      helpModal.close();
    });

    helpModal.addEventListener('click', e => {
      if (e.target === helpModal) helpModal.close();
    });

    setupInput();
    startNewGame();
  }

  function pause() {
    if (!isPaused && !isGameOver) {
      togglePause();
    }
  }

  function resume() {
    if (isPaused && !isGameOver) {
      togglePause();
    }
  }

  window.tetrisGame = {
    init,
    startNewGame,
    pause,
    resume,
    togglePause,
    toggleMute,
  };

  // Launch on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
