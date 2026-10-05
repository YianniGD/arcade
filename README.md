# Arcade Classics

Unified, zero-build web arcade featuring classic games. Pure HTML5, CSS3, and ES6.

```
index.html        ← Root SPA entry point (deploys anywhere)
css/
  arcade.css      ← Shared theme & catalog layout
  tetris.css      ← Tetris styles
  2048.css        ← 2048 styles & animations
js/
  app.js          ← SPA router & view transitions
  audio.js        ← Web Audio procedural synthesizer
  tetris.js       ← SRS Guideline Tetris engine
  2048.js         ← Vanilla 2048 engine (undo & swipe)
covers/           ← SVG game covers
favicon.svg       ← Favicon
games.json        ← Game catalog registry
```

## Run Locally

```sh
npm start         # Zero-dependency static server at http://localhost:4173
```
Or open `index.html` directly in any web browser.

## Cloudflare Pages / GitHub Pages Deployment

No build command or framework configuration required:
- **Build command:** None (leave empty)
- **Build output directory:** `/` (root)
