/**
 * Generate PNG icons from SVG for iOS PWA support.
 * Run: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');
const svgPath = resolve(publicDir, 'pwa-512x512.svg');
const svg = readFileSync(svgPath);

const sizes = [
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
];

console.log('Generating PWA icons...');

for (const { name, size } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(publicDir, name));
  console.log(`  ✓ ${name}`);
}

console.log('Done!');
