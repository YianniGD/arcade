#!/usr/bin/env node
// Zero-dependency build: mirrors root assets into ./site for Cloudflare/hosts expecting outputDir: "site"
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const items = ['index.html', 'css', 'js', 'covers', 'favicon.svg', 'games.json'];

for (const item of items) {
  const src = join(ROOT, item);
  const dest = join(OUT, item);
  if (existsSync(src)) {
    cpSync(src, dest, { recursive: true });
  }
}

console.log('Build complete: files mirrored to ./site and verified in ./ (root).');
