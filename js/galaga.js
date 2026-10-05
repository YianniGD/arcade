/**
 * GALAGA — RETRO CANVAS ARCADE ENGINE
 * High-DPI Parallax Starfield, SRS-Style Curved Alien Swoops, Dual Cannons, & Particle FX
 */

(function () {
  'use strict';

  const WIDTH = 480;
  const HEIGHT = 640;
  const HIGH_SCORE_KEY = 'galaga-high-score';

  let canvas, ctx;
  let animationId = null;
  let isPaused = false;
  let isGameOver = false;

  let score = 0;
  let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '20000', 10);
  let stage = 1;
  let lives = 3;

  // Starfield
  let stars = [];
  const STAR_COUNT = 90;

  // Entities
  let player;
  let playerBullets = [];
  let enemies = [];
  let enemyBullets = [];
  let particles = [];

  // Key tracking
  const keys = {
    left: false,
    right: false,
    fire: false,
  };

  let lastFireTime = 0;
  const FIRE_RATE = 200; // ms

  // Game loop timing
  let lastTime = 0;
  let diveTimer = 0;
  let stageTransitionTimer = 0;
  let stageIntroText = '';
  let shakeTime = 0;

  // DOM Elements
  let pauseOverlay, gameoverOverlay, finalScoreEl, finalStageEl;
  let btnResume, btnRestartPause, btnPlayAgain;
  let btnSound, btnPauseHeader, btnHelp, btnCloseHelp, helpModal;
  let iconSoundOn, iconSoundOff;
  let touchLeft, touchRight, touchFire;

  // =========================================================================
  // STARFIELD
  // =========================================================================
  function initStarfield() {
    stars = [];
    const colors = ['#fff', '#38bdf8', '#facc15', '#f43f5e', '#a855f7'];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        size: Math.random() < 0.2 ? 2 : 1,
        speed: 0.5 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        twinkle: Math.random() * Math.PI,
      });
    }
  }

  function updateStars(dt) {
    const warpMult = stageTransitionTimer > 0 ? 4 : 1;
    for (let star of stars) {
      star.y += star.speed * warpMult * (dt / 16);
      if (star.y > HEIGHT) {
        star.y = 0;
        star.x = Math.random() * WIDTH;
      }
      star.twinkle += 0.05;
    }
  }

  function drawStars() {
    for (let star of stars) {
      const alpha = 0.5 + 0.5 * Math.sin(star.twinkle);
      ctx.fillStyle = star.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  // =========================================================================
  // PARTICLES
  // =========================================================================
  function spawnExplosion(x, y, color = '#ef4444', count = 22) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: i % 2 === 0 ? color : '#facc15',
        life: 1,
        decay: 0.025 + Math.random() * 0.03,
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (let p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  // =========================================================================
  // PLAYER SHIP
  // =========================================================================
  function createPlayer() {
    return {
      x: WIDTH / 2,
      y: HEIGHT - 55,
      width: 32,
      height: 32,
      speed: 4.8,
      invulnerable: 0,
      visible: true,
    };
  }

  function drawPlayerShip(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Fuselage
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(4, -2);
    ctx.lineTo(4, 10);
    ctx.lineTo(-4, 10);
    ctx.lineTo(-4, -2);
    ctx.closePath();
    ctx.fill();

    // Red Wing Trim
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-3, -8);
    ctx.lineTo(0, -12);
    ctx.lineTo(3, -8);
    ctx.lineTo(3, -2);
    ctx.lineTo(-3, -2);
    ctx.closePath();
    ctx.fill();

    // Wings
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-4, 2);
    ctx.lineTo(-14, 10);
    ctx.lineTo(-14, 4);
    ctx.lineTo(-6, -2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.lineTo(14, 10);
    ctx.lineTo(14, 4);
    ctx.lineTo(6, -2);
    ctx.closePath();
    ctx.fill();

    // Red Wingtips / Cannons
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-14, -3, 2, 8);
    ctx.fillRect(12, -3, 2, 8);

    // Cockpit
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-1.5, 1, 3, 5);

    // Thruster flame
    if (Math.random() < 0.7) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-3, 11);
      ctx.lineTo(0, 16 + Math.random() * 4);
      ctx.lineTo(3, 11);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  function fireLaser() {
    if (playerBullets.length >= 4) return; // Limit on-screen shots for arcade balance
    const now = performance.now();
    if (now - lastFireTime < FIRE_RATE) return;

    lastFireTime = now;
    if (window.soundEngine) window.soundEngine.playLaser();

    // Dual cannons
    playerBullets.push({
      x: player.x - 10,
      y: player.y - 12,
      vx: 0,
      vy: -11,
      width: 3,
      height: 14,
    });
    playerBullets.push({
      x: player.x + 10,
      y: player.y - 12,
      vx: 0,
      vy: -11,
      width: 3,
      height: 14,
    });
  }

  // =========================================================================
  // ENEMIES & FORMATIONS
  // =========================================================================
  // Enemy Types:
  // - boss: 150 pts idle, 400 pts diving (takes 2 hits)
  // - goei: 80 pts idle, 160 pts diving (red butterfly)
  // - zako: 50 pts idle, 100 pts diving (blue bug)
  function createEnemiesForStage(lvl) {
    const list = [];
    const rows = [
      { type: 'boss', y: 110, count: 4, spacing: 56, hp: 2 },
      { type: 'goei', y: 150, count: 8, spacing: 44, hp: 1 },
      { type: 'goei', y: 185, count: 8, spacing: 44, hp: 1 },
      { type: 'zako', y: 220, count: 10, spacing: 38, hp: 1 },
      { type: 'zako', y: 255, count: 10, spacing: 38, hp: 1 },
    ];

    rows.forEach(r => {
      const startX = (WIDTH - (r.count - 1) * r.spacing) / 2;
      for (let i = 0; i < r.count; i++) {
        list.push({
          type: r.type,
          hp: r.hp,
          maxHp: r.hp,
          homeX: startX + i * r.spacing,
          homeY: r.y,
          x: startX + i * r.spacing,
          y: -50 - Math.random() * 200, // swoop in from top
          width: 26,
          height: 24,
          state: 'entering', // 'entering' | 'formation' | 'diving' | 'returning'
          divePhase: 0,
          diveSpeed: 2.2 + lvl * 0.25,
          angle: 0,
          animFrame: 0,
        });
      }
    });

    return list;
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);

    const flap = Math.sin(e.animFrame * 0.2) * 2;

    if (e.type === 'boss') {
      // Boss Galaga (Green or Dark Blue when hit)
      const mainColor = e.hp === 1 ? '#0369a1' : '#10b981';
      // Wings
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.moveTo(-16 + flap, 4);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, -6);
      ctx.lineTo(-10 + flap, 10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(16 - flap, 4);
      ctx.lineTo(8, -8);
      ctx.lineTo(4, -6);
      ctx.lineTo(10 - flap, 10);
      ctx.closePath();
      ctx.fill();

      // Core
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(0, -10);
      ctx.lineTo(8, 0);
      ctx.lineTo(4, 10);
      ctx.lineTo(-4, 10);
      ctx.closePath();
      ctx.fill();

      // Yellow Eyes
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-4, -4, 3, 3);
      ctx.fillRect(1, -4, 3, 3);
    } else if (e.type === 'goei') {
      // Red Butterfly
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(-12 + flap, 2);
      ctx.lineTo(-6, -6);
      ctx.lineTo(0, -2);
      ctx.lineTo(6, -6);
      ctx.lineTo(12 - flap, 2);
      ctx.lineTo(8 - flap, 8);
      ctx.lineTo(-8 + flap, 8);
      ctx.closePath();
      ctx.fill();

      // Yellow Antenna & Center
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-2, -7, 4, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-3, 0, 2, 2);
      ctx.fillRect(1, 0, 2, 2);
    } else {
      // Blue Zako Bug
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(-10 + flap, 0);
      ctx.lineTo(-4, -8);
      ctx.lineTo(0, -4);
      ctx.lineTo(4, -8);
      ctx.lineTo(10 - flap, 0);
      ctx.lineTo(6 - flap, 8);
      ctx.lineTo(-6 + flap, 8);
      ctx.closePath();
      ctx.fill();

      // Red Eyes
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-3, -1, 2, 2);
      ctx.fillRect(1, -1, 2, 2);
    }

    ctx.restore();
  }

  function startDive(e) {
    if (e.state !== 'formation') return;
    e.state = 'diving';
    e.divePhase = 0;
    e.diveStartX = e.x;
    e.diveStartY = e.y;
    e.diveDir = e.x < player.x ? 1 : -1;
    if (window.soundEngine) window.soundEngine.playDive();
  }

  function updateEnemies(dt) {
    const formationSway = Math.sin(performance.now() * 0.002) * 14;

    diveTimer += dt;
    if (diveTimer > Math.max(900, 2400 - stage * 200)) {
      diveTimer = 0;
      // Pick 1-2 random formation enemies to dive
      const ready = enemies.filter(e => e.state === 'formation');
      if (ready.length) {
        const picker = ready[Math.floor(Math.random() * ready.length)];
        startDive(picker);
      }
    }

    for (let e of enemies) {
      e.animFrame++;

      if (e.state === 'entering') {
        // Move towards home position smoothly
        const dx = (e.homeX + formationSway) - e.x;
        const dy = e.homeY - e.y;
        e.x += dx * 0.05;
        e.y += dy * 0.05;
        e.angle = Math.atan2(dy, dx) - Math.PI / 2;

        if (Math.hypot(dx, dy) < 4) {
          e.state = 'formation';
          e.angle = 0;
        }
      } else if (e.state === 'formation') {
        e.x = e.homeX + formationSway;
        e.y = e.homeY;
        e.angle = 0;
      } else if (e.state === 'diving') {
        e.divePhase += 0.035 * (e.diveSpeed / 2.5);

        // Spline / swoop loop curve
        const swoopX = Math.sin(e.divePhase * Math.PI) * 75 * e.diveDir;
        const swoopY = e.divePhase * HEIGHT * 0.85;

        e.x = e.diveStartX + swoopX;
        e.y = e.diveStartY + swoopY;

        // Angle faces motion
        e.angle = Math.sin(e.divePhase * Math.PI) * e.diveDir * 0.9;

        // Enemy bullet shot during dive
        if (Math.abs(e.divePhase - 0.45) < 0.03 && Math.random() < 0.65) {
          enemyBullets.push({
            x: e.x,
            y: e.y + 10,
            vx: (player.x - e.x) * 0.015,
            vy: 4.5 + stage * 0.2,
            size: 4,
          });
        }

        // Reached bottom: loop back to top
        if (e.y > HEIGHT + 40) {
          e.y = -30;
          e.x = e.homeX;
          e.state = 'returning';
        }
      } else if (e.state === 'returning') {
        const dx = (e.homeX + formationSway) - e.x;
        const dy = e.homeY - e.y;
        e.x += dx * 0.06;
        e.y += dy * 0.06;
        e.angle = 0;
        if (Math.hypot(dx, dy) < 4) {
          e.state = 'formation';
        }
      }
    }
  }

  // =========================================================================
  // COLLISIONS & BULLETS
  // =========================================================================
  function updateBullets() {
    // Player lasers
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const b = playerBullets[i];
      b.y += b.vy;

      if (b.y < -20) {
        playerBullets.splice(i, 1);
        continue;
      }

      // Check enemy hits
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (Math.abs(b.x - e.x) < e.width / 2 + 3 && Math.abs(b.y - e.y) < e.height / 2 + 5) {
          // Hit!
          playerBullets.splice(i, 1);
          e.hp--;

          if (e.hp <= 0) {
            // Destroyed
            const isDiving = e.state === 'diving';
            const pts = e.type === 'boss' ? (isDiving ? 400 : 150) : e.type === 'goei' ? (isDiving ? 160 : 80) : (isDiving ? 100 : 50);

            score += pts;
            if (score > highScore) {
              highScore = score;
              localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
            }

            spawnExplosion(e.x, e.y, e.type === 'boss' ? '#10b981' : e.type === 'goei' ? '#f43f5e' : '#0284c7');
            if (window.soundEngine) window.soundEngine.playExplosion();

            enemies.splice(j, 1);
          } else {
            // Damaged Boss
            spawnExplosion(e.x, e.y, '#facc15', 8);
          }
          break;
        }
      }
    }

    // Enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      eb.x += eb.vx;
      eb.y += eb.vy;

      if (eb.y > HEIGHT + 20 || eb.x < -20 || eb.x > WIDTH + 20) {
        enemyBullets.splice(i, 1);
        continue;
      }

      // Check hit against player
      if (player.invulnerable <= 0 && Math.abs(eb.x - player.x) < 14 && Math.abs(eb.y - player.y) < 14) {
        enemyBullets.splice(i, 1);
        killPlayer();
        break;
      }
    }

    // Check direct collision with diving enemies
    if (player.invulnerable <= 0) {
      for (let e of enemies) {
        if (Math.abs(e.x - player.x) < 18 && Math.abs(e.y - player.y) < 18) {
          killPlayer();
          break;
        }
      }
    }
  }

  function killPlayer() {
    shakeTime = 18;
    spawnExplosion(player.x, player.y, '#ef4444', 36);
    if (window.soundEngine) window.soundEngine.playPlayerExplosion();

    lives--;
    if (lives <= 0) {
      triggerGameOver();
    } else {
      player.x = WIDTH / 2;
      player.invulnerable = 120; // ~2 seconds of flashing invulnerability
    }
  }

  function drawBullets() {
    // Player laser dual beams
    for (let b of playerBullets) {
      ctx.save();
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x - b.width / 2, b.y, b.width, b.height);
      ctx.restore();
    }

    // Enemy energy orbs
    ctx.fillStyle = '#ef4444';
    for (let eb of enemyBullets) {
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =========================================================================
  // HUD & UI
  // =========================================================================
  function drawHUD() {
    ctx.save();
    ctx.font = '700 13px "Space Mono", monospace';
    ctx.fillStyle = '#94a3b8';

    // Top: 1UP Score & HIGH SCORE
    ctx.fillText('1UP', 24, 24);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(score).padStart(6, '0'), 24, 42);

    ctx.fillStyle = '#ef4444';
    ctx.fillText('HIGH', WIDTH - 120, 24);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(highScore).padStart(6, '0'), WIDTH - 120, 42);

    // Bottom: Lives Ships & Stage Flag
    ctx.fillStyle = '#38bdf8';
    for (let i = 0; i < lives - 1; i++) {
      drawPlayerShip(30 + i * 26, HEIGHT - 18, 0.65);
    }

    // Stage Badges
    ctx.fillStyle = '#facc15';
    ctx.font = '700 12px "Space Mono", monospace';
    ctx.fillText(`STAGE ${stage}`, WIDTH - 90, HEIGHT - 14);

    // Stage Intro Banner
    if (stageTransitionTimer > 0) {
      ctx.fillStyle = '#facc15';
      ctx.font = '800 24px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(stageIntroText, WIDTH / 2, HEIGHT / 2 + 10);
    }

    ctx.restore();
  }

  // =========================================================================
  // MAIN LOOP
  // =========================================================================
  function update(time) {
    if (!lastTime) lastTime = time;
    const dt = Math.min(32, time - lastTime);
    lastTime = time;

    if (!isPaused && !isGameOver) {
      updateStars(dt);

      // Player Movement
      if (keys.left) player.x = Math.max(player.width / 2 + 8, player.x - player.speed);
      if (keys.right) player.x = Math.min(WIDTH - player.width / 2 - 8, player.x + player.speed);
      if (keys.fire) fireLaser();

      if (player.invulnerable > 0) player.invulnerable--;

      updateEnemies(dt);
      updateBullets();
      updateParticles();

      // Check Wave Clear
      if (enemies.length === 0 && stageTransitionTimer <= 0) {
        stageTransitionTimer = 140; // ~2.5 seconds
        stageIntroText = `STAGE ${stage + 1}`;
        if (window.soundEngine) window.soundEngine.playStageStart();
      }

      if (stageTransitionTimer > 0) {
        stageTransitionTimer--;
        if (stageTransitionTimer === 0) {
          stage++;
          enemies = createEnemiesForStage(stage);
          enemyBullets = [];
        }
      }

      if (shakeTime > 0) shakeTime--;
    }

    // --- Render ---
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    if (shakeTime > 0) {
      ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }

    drawStars();
    drawParticles();

    // Draw Enemies
    for (let e of enemies) drawEnemy(e);

    drawBullets();

    // Draw Player (with invulnerability flicker)
    if (!isGameOver && (player.invulnerable % 8 < 4)) {
      drawPlayerShip(player.x, player.y);
    }

    drawHUD();
    ctx.restore();

    animationId = requestAnimationFrame(update);
  }

  // =========================================================================
  // GAME STATES
  // =========================================================================
  function startNewGame() {
    score = 0;
    stage = 1;
    lives = 3;
    isGameOver = false;
    isPaused = false;
    stageTransitionTimer = 100;
    stageIntroText = 'STAGE 1';
    diveTimer = 0;
    shakeTime = 0;

    player = createPlayer();
    playerBullets = [];
    enemyBullets = [];
    particles = [];
    enemies = createEnemiesForStage(stage);

    if (pauseOverlay) pauseOverlay.hidden = true;
    if (gameoverOverlay) gameoverOverlay.hidden = true;

    initStarfield();
    if (window.soundEngine) window.soundEngine.playStageStart();

    lastTime = performance.now();
  }

  function triggerGameOver() {
    isGameOver = true;
    if (finalScoreEl) finalScoreEl.textContent = score.toLocaleString();
    if (finalStageEl) finalStageEl.textContent = stage;
    if (gameoverOverlay) gameoverOverlay.hidden = false;
  }

  function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (pauseOverlay) pauseOverlay.hidden = !isPaused;
    if (!isPaused) lastTime = performance.now();
  }

  function pause() {
    if (!isPaused && !isGameOver) togglePause();
  }

  function resume() {
    if (isPaused && !isGameOver) togglePause();
  }

  function toggleMute() {
    if (!window.soundEngine) return;
    const muted = window.soundEngine.toggleMute();
    if (iconSoundOn) iconSoundOn.classList.toggle('hidden', muted);
    if (iconSoundOff) iconSoundOff.classList.toggle('hidden', !muted);
  }

  // =========================================================================
  // INPUT & CONTROLS
  // =========================================================================
  function setupInput() {
    window.addEventListener('keydown', e => {
      const viewGalaga = document.getElementById('view-galaga');
      if (!viewGalaga || !viewGalaga.classList.contains('active')) return;

      if (window.soundEngine) window.soundEngine.init();

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (isGameOver) {
        if (e.code === 'Enter' || e.code === 'Space') startNewGame();
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

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.fire = true;
    });

    window.addEventListener('keyup', e => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.fire = false;
    });

    // Touch D-Pad Controls
    if (touchLeft) {
      touchLeft.addEventListener('touchstart', e => { e.preventDefault(); keys.left = true; }, { passive: false });
      touchLeft.addEventListener('touchend', e => { e.preventDefault(); keys.left = false; }, { passive: false });
    }
    if (touchRight) {
      touchRight.addEventListener('touchstart', e => { e.preventDefault(); keys.right = true; }, { passive: false });
      touchRight.addEventListener('touchend', e => { e.preventDefault(); keys.right = false; }, { passive: false });
    }
    if (touchFire) {
      touchFire.addEventListener('touchstart', e => { e.preventDefault(); keys.fire = true; }, { passive: false });
      touchFire.addEventListener('touchend', e => { e.preventDefault(); keys.fire = false; }, { passive: false });
    }

    // Touch Drag on Canvas
    if (canvas) {
      canvas.addEventListener('touchmove', e => {
        if (isPaused || isGameOver || e.touches.length !== 1) return;
        const rect = canvas.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const scaleX = WIDTH / rect.width;
        player.x = Math.max(player.width / 2 + 8, Math.min(WIDTH - player.width / 2 - 8, touchX * scaleX));
        keys.fire = true;
      }, { passive: true });

      canvas.addEventListener('touchend', () => {
        keys.fire = false;
      }, { passive: true });
    }
  }

  // =========================================================================
  // INIT
  // =========================================================================
  function init() {
    canvas = document.getElementById('galaga-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    pauseOverlay = document.getElementById('overlay-galaga-pause');
    gameoverOverlay = document.getElementById('overlay-galaga-gameover');
    finalScoreEl = document.getElementById('val-galaga-final-score');
    finalStageEl = document.getElementById('val-galaga-final-stage');

    btnResume = document.getElementById('btn-galaga-resume');
    btnRestartPause = document.getElementById('btn-galaga-restart-pause');
    btnPlayAgain = document.getElementById('btn-galaga-play-again');

    btnSound = document.getElementById('btn-sound-galaga');
    btnPauseHeader = document.getElementById('btn-pause-galaga');
    btnHelp = document.getElementById('btn-help-galaga');
    btnCloseHelp = document.getElementById('btn-close-help-galaga');
    helpModal = document.getElementById('help-modal-galaga');

    iconSoundOn = document.getElementById('icon-sound-on-galaga');
    iconSoundOff = document.getElementById('icon-sound-off-galaga');

    touchLeft = document.getElementById('t-galaga-left');
    touchRight = document.getElementById('t-galaga-right');
    touchFire = document.getElementById('t-galaga-fire');

    if (btnResume) btnResume.addEventListener('click', togglePause);
    if (btnRestartPause) btnRestartPause.addEventListener('click', startNewGame);
    if (btnPlayAgain) btnPlayAgain.addEventListener('click', startNewGame);

    if (btnSound) btnSound.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.init();
      toggleMute();
    });

    if (btnPauseHeader) btnPauseHeader.addEventListener('click', togglePause);

    if (btnHelp && helpModal) {
      btnHelp.addEventListener('click', () => helpModal.showModal());
    }
    if (btnCloseHelp && helpModal) {
      btnCloseHelp.addEventListener('click', () => helpModal.close());
    }

    setupInput();
    startNewGame();

    animationId = requestAnimationFrame(update);
  }

  window.galagaGame = {
    init,
    startNewGame,
    pause,
    resume,
    togglePause,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
