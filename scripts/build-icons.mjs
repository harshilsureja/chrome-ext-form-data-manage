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
