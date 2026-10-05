// "Back to Hub" chip — inlined into every game's index.html at build time.
// Shadow DOM isolates it from each game's CSS. Position is set per game via
// the `returnButton` field in games.json ("top-left" | "top-right" |
// "bottom-left" | "bottom-right" | false).
(() => {
  const pos = document.currentScript?.dataset.position || 'top-left';
  const [v, h] = pos.split('-');

  const host = document.createElement('div');
  host.id = 'gamehub-return';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      a {
        position: fixed; ${v}: max(16px, env(safe-area-inset-${v})); ${h}: max(16px, env(safe-area-inset-${h}));
        z-index: 2147483647;
        display: flex; align-items: center; gap: 6px;
        height: 36px; padding: 0 14px 0 10px;
        font: 700 11px/1 'Space Mono', ui-monospace, monospace;
        letter-spacing: .14em; text-transform: uppercase; text-decoration: none;
        color: #f1f5f9; background: rgba(18,22,31,.88);
        border: 1px solid rgba(255,255,255,.22); border-radius: 999px;
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        box-shadow: 0 8px 24px -8px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.1);
        transition: transform .25s, border-color .25s, background .25s;
        -webkit-tap-highlight-color: transparent;
      }
      a:hover, a:focus-visible {
        transform: translateY(${v === 'top' ? '1px' : '-1px'});
        border-color: rgba(255,255,255,.45); background: rgba(26,32,44,.95); outline: none;
      }
      svg { flex: none; }
    </style>
    <a href="../" aria-label="Back to Arcade Classics">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      <span>Back</span>
    </a>`;

  // Stop game keyboard handlers from swallowing Enter/Space on the chip
  root.querySelector('a').addEventListener('keydown', (e) => e.stopPropagation());

  const mount = () => document.body.append(host);
  document.body ? mount() : document.addEventListener('DOMContentLoaded', mount);
})();
