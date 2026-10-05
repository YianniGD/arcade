#!/usr/bin/env node
// Assembles the hub + every registered game into ./site (deployable anywhere).
//
//   node scripts/build.mjs          build everything
//   node scripts/build.mjs tetris   rebuild one game only (hub is always refreshed)
//
// Game types (set "type" in hub/games.json):
//   static → folder is copied as-is (plain HTML/CSS/JS)
//   vite   → `npm run build` is run inside the folder with a relative base
//            and output piped straight into site/<id>/

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HUB = join(ROOT, 'hub');
const OUT = join(ROOT, 'site');
const SKIP = new Set(['.git', '.github', 'node_modules', '.DS_Store', 'dist']);

const registry = JSON.parse(readFileSync(join(HUB, 'games.json'), 'utf8'));
const returnScript = readFileSync(join(HUB, 'return-button.js'), 'utf8');
const only = process.argv[2];

const log = (tag, msg) => console.log(`\x1b[35m${tag.padEnd(7)}\x1b[0m ${msg}`);

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed in ${cwd}`);
}

// --- 1. Hub -----------------------------------------------------------------
if (!only) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(HUB, OUT, {
  recursive: true,
  filter: (src) => !src.endsWith('return-button.js') && !src.endsWith('.DS_Store'),
});
log('hub', 'copied');

// --- 2. Games ---------------------------------------------------------------
const builders = {
  static(game, src, dest) {
    cpSync(src, dest, {
      recursive: true,
      filter: (p) => !SKIP.has(p.split('/').pop()),
    });
  },
  vite(game, src, dest) {
    if (!existsSync(join(src, 'node_modules'))) run('npm', ['ci'], src);
    // Extra args are appended to the game's own build script (→ vite build)
    run('npm', ['run', 'build', '--', '--base', './', '--outDir', dest, '--emptyOutDir'], src);
  },
};

for (const game of registry.games) {
  if (only && game.id !== only) continue;
  const src = join(ROOT, game.source);
  const dest = join(OUT, game.id);
  const build = builders[game.type];

  if (!existsSync(src)) { log('skip', `${game.id}: source "${game.source}" not found`); continue; }
  if (!build) { log('skip', `${game.id}: unknown type "${game.type}"`); continue; }

  log('build', `${game.id} (${game.type})`);
  rmSync(dest, { recursive: true, force: true });
  build(game, src, dest);

  // Inject view-transition opt-in + return chip into the game's entry HTML
  const html = join(dest, 'index.html');
  if (existsSync(html) && game.returnButton !== false) {
    const pos = game.returnButton || 'top-left';
    const vt = '<style>@media (prefers-reduced-motion: no-preference){@view-transition{navigation:auto}}</style>';
    const chip = `<script data-position="${pos}">${returnScript}</script>`;
    const out = readFileSync(html, 'utf8')
      .replace('</head>', `${vt}\n</head>`)
      .replace('</body>', `${chip}\n</body>`);
    writeFileSync(html, out);
  }
  log('done', `site/${game.id}/`);
}

log('ready', `→ ${OUT}`);
