// Game Hub — renders cards from games.json. No framework, no build step.

const LAST_KEY = 'gamehub:last';
const grid = document.querySelector('[data-grid]');
const status = document.querySelector('[data-status]');
const tpl = document.getElementById('card-tpl');

const pad = (n) => String(n).padStart(2, '0');

function showStatus(html) {
  status.innerHTML = html;
  status.hidden = false;
}

function renderCard(game, i, lastId) {
  const node = tpl.content.cloneNode(true);
  const card = node.querySelector('.card');
  const img = node.querySelector('.cover img');

  card.href = `./${game.id}/`;
  card.style.setProperty('--accent', game.accent || '#8b5cf6');
  card.style.setProperty('--i', i);
  card.dataset.id = game.id;
  card.setAttribute('aria-label', `Play ${game.title}`);

  if (game.cover) img.src = game.cover;
  else img.remove();

  node.querySelector('.cover-fallback').textContent = game.title.slice(0, 2);
  node.querySelector('.index').textContent = pad(i + 1);
  node.querySelector('.card-title .t').textContent = game.title;
  node.querySelector('.card-title .s').textContent = game.subtitle || '';
  node.querySelector('.tagline').textContent = game.tagline || '';

  const tags = node.querySelector('.tags');
  for (const tag of game.tags || []) {
    const li = document.createElement('li');
    li.textContent = tag;
    tags.append(li);
  }

  if (game.id === lastId) node.querySelector('.badge').hidden = false;

  card.addEventListener('click', () => localStorage.setItem(LAST_KEY, game.id));
  return node;
}

async function init() {
  let data;
  try {
    const res = await fetch('games.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.statusText);
    data = await res.json();
  } catch {
    showStatus(
      'Could not load <code>games.json</code>.<br>' +
      'Open through a local server: <code>npm run build && npm run serve</code>'
    );
    return;
  }

  const { hub = {}, games = [] } = data;
  if (hub.title) {
    document.title = hub.title;
    document.querySelector('[data-hub-title]').textContent = hub.title;
  }
  const subEl = document.querySelector('[data-hub-subtitle]');
  if (subEl) {
    if (hub.subtitle) subEl.textContent = hub.subtitle;
    else subEl.remove();
  }

  document.querySelector('[data-count]').textContent = pad(games.length);
  document.querySelector('[data-max-key]').textContent = Math.min(games.length, 9);

  const lastId = localStorage.getItem(LAST_KEY);
  const frag = document.createDocumentFragment();
  games.forEach((g, i) => frag.append(renderCard(g, i, lastId)));

  // Ghost slot — set "showNextSlot": false in games.json to hide
  if (hub.showNextSlot !== false) {
    const slot = document.createElement('li');
    slot.className = 'card-item';
    slot.setAttribute('aria-hidden', 'true');
    slot.innerHTML = `<div class="slot" style="--i:${games.length}"><span class="slot-mark">+</span>Slot ${pad(games.length + 1)}<br>More soon</div>`;
    frag.append(slot);
  }
  grid.append(frag);

  if (!games.length) showStatus('No games registered yet. Add one to <code>hub/games.json</code>.');

  // Number-key shortcuts: 1–9 launches the matching card
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const n = Number(e.key);
    if (n >= 1 && n <= Math.min(games.length, 9)) {
      grid.querySelectorAll('.card')[n - 1]?.click();
    }
  });
}

init();
