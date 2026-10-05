#!/usr/bin/env node
// Zero-dependency static server for ./site  →  node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const PORT = Number(process.argv[2]) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

if (!existsSync(ROOT)) {
  console.error('No ./site folder. Run `npm run build` first.');
  process.exit(1);
}

createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(ROOT, url));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }

  // Directory without trailing slash → redirect so relative paths resolve
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!url.endsWith('/')) { res.writeHead(301, { Location: url + '/' }).end(); return; }
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) { res.writeHead(404).end('Not found'); return; }

  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Arcade Classics → http://localhost:${PORT}`));
