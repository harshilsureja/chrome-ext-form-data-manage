// Renders assets/logo*.svg into the PNG sizes Chrome needs (public/icons).
// Run with: npm run icons
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'public', 'icons');
await mkdir(out, { recursive: true });

const sizes = [
  [16, 'logo-small.svg'],
  [32, 'logo-small.svg'],
  [48, 'logo.svg'],
  [128, 'logo.svg'],
];

for (const [size, file] of sizes) {
  await sharp(path.join(root, 'assets', file), { density: 72 * (size / 32) * 4 })
    .resize(size, size)
    .png()
    .toFile(path.join(out, `icon${size}.png`));
  console.log(`icon${size}.png  ←  ${file}`);
}

// High-resolution logo PNGs for docs, store listings, social posts, etc.
for (const size of [256, 512, 1024]) {
  await sharp(path.join(root, 'assets', 'logo.svg'), { density: 72 * (size / 128) * 2 })
    .resize(size, size)
    .png()
    .toFile(path.join(root, 'assets', `logo-${size}.png`));
  console.log(`assets/logo-${size}.png`);
}
