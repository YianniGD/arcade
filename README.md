# Arcade Classics

Landing page and unified collection for classic web games.

```
hub/              ← landing source (edit here)
  games.json      ← THE REGISTRY — add games here
  covers/         ← 4:3 cover art (SVG/PNG/WebP)
  index.html · hub.css · hub.js
  return-button.js← "‹ Back" chip injected into each game at build
tetris/ · 2048/   ← game sources (never modified by the collection)
scripts/          ← build.mjs + serve.mjs (zero dependencies)
site/             ← build output — deploy this folder
```

## Run

```sh
npm start          # build + serve at http://localhost:4173
npm run build      # build only  (npm run build -- tetris  → one game)
```

## Add a game

1. Drop the game folder next to `tetris/`.
2. Add a cover to `hub/covers/` (4:3, e.g. 800×600).
3. Add an entry to `hub/games.json`:

```json
{
  "id": "snake",                 // URL → /snake/
  "title": "Snake",
  "subtitle": "Neon",
  "tagline": "One line about the game.",
  "source": "snake",             // folder name
  "type": "static",              // "static" = plain HTML · "vite" = Vite project
  "accent": "#10b981",           // card glow + play button colour
  "cover": "covers/snake.svg",   // optional — falls back to a monogram
  "tags": ["Arcade", "Keyboard"],
  "returnButton": "top-left"     // top-/bottom- left/right, or false
}
```

4. `npm start`.

Hub-level options (`"hub"` object): `title`, `subtitle`, `showNextSlot` (false hides the dashed placeholder card).
