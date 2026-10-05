/**
 * ARCADE CLASSICS — APPLICATION CONTROLLER & ROUTER
 * Zero-dependency SPA manager with hash-based routing & view transitions
 */

(function () {
  'use strict';

  const LAST_KEY = 'arcade:last-played';
  const VIEWS = {
    catalog: document.getElementById('view-catalog'),
    tetris: document.getElementById('view-tetris'),
    '2048': document.getElementById('view-2048'),
    galaga: document.getElementById('view-galaga'),
  };

  let currentView = 'catalog';

  function getTargetView() {
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    if (hash === 'tetris') return 'tetris';
    if (hash === '2048') return '2048';
    if (hash === 'galaga') return 'galaga';
    return 'catalog';
  }

  function updateLastPlayedBadges() {
    const lastId = localStorage.getItem(LAST_KEY);
    document.querySelectorAll('[data-last-badge]').forEach(badge => {
      const cardId = badge.closest('[data-id]')?.dataset.id;
      badge.hidden = !lastId || cardId !== lastId;
    });
  }

  function switchView(target) {
    if (!VIEWS[target]) target = 'catalog';
    if (currentView === target && VIEWS[target].classList.contains('active')) return;

    // 1. Pause any running game
    if (currentView === 'tetris' && window.tetrisGame) {
      window.tetrisGame.pause();
    }
    if (currentView === 'galaga' && window.galagaGame) {
      window.galagaGame.pause();
    }

    // 2. Hide all views & show target
    Object.entries(VIEWS).forEach(([name, el]) => {
      if (!el) return;
      if (name === target) {
        el.hidden = false;
        // Force reflow for CSS opacity transition
        void el.offsetWidth;
        el.classList.add('active');
      } else {
        el.classList.remove('active');
        el.hidden = true;
      }
    });

    currentView = target;

    // 3. Update Document Title & State
    if (target === 'tetris') {
      document.title = 'Tetris — Arcade Classics';
      localStorage.setItem(LAST_KEY, 'tetris');
      updateLastPlayedBadges();
      if (window.tetrisGame) window.tetrisGame.resume();
    } else if (target === '2048') {
      document.title = '2048 — Arcade Classics';
      localStorage.setItem(LAST_KEY, '2048');
      updateLastPlayedBadges();
    } else if (target === 'galaga') {
      document.title = 'Galaga — Arcade Classics';
      localStorage.setItem(LAST_KEY, 'galaga');
      updateLastPlayedBadges();
      if (window.galagaGame) window.galagaGame.resume();
    } else {
      document.title = 'Arcade Classics';
      updateLastPlayedBadges();
    }

    window.scrollTo(0, 0);
  }

  // --- Keyboard Shortcuts ---
  window.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // If on catalog view: 1 launches Tetris, 2 launches 2048, 3 launches Galaga
    if (currentView === 'catalog') {
      if (e.key === '1') {
        window.location.hash = '#/tetris';
      } else if (e.key === '2') {
        window.location.hash = '#/2048';
      } else if (e.key === '3') {
        window.location.hash = '#/galaga';
      }
    }
  });

  // Handle Hash Changes
  window.addEventListener('hashchange', () => {
    switchView(getTargetView());
  });

  // Initialize
  function init() {
    updateLastPlayedBadges();

    // Init games
    if (window.game2048) window.game2048.init();
    if (window.galagaGame) window.galagaGame.init();

    // Switch to initial route
    switchView(getTargetView());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
