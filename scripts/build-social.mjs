// Renders the 1280x640 social preview (GitHub repo card / Open Graph image)
// into docs/assets/social-preview.png. Run with: npm run social
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const W = 1280;
const H = 640;
const font = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

// Inline the logo's inner markup so it can be placed inside the card SVG.
const logoSvg = await readFile(path.join(root, 'assets', 'logo.svg'), 'utf8');
const logoInner = logoSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const chips = ['Profile autofill', 'Realistic test data', 'Save & replay'];
let chipX = 96;
const chipSvg = chips
  .map((label) => {
    const w = label.length * 10.6 + 36;
    const g = `<g transform="translate(${chipX} 420)">
      <rect width="${w}" height="40" rx="20" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.14"/>
      <text x="${w / 2}" y="26" text-anchor="middle" font-family="${font}" font-size="17" fill="#d4d4d8">${label.replace('&', '&amp;')}</text>
    </g>`;
    chipX += w + 12;
    return g;
  })
  .join('');

const background = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="78%" cy="20%" r="70%">
      <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.45"/>
      <stop offset="0.45" stop-color="#6366f1" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#09090b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#c4b5fd"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.045"/>
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#09090b" stop-opacity="0"/>
      <stop offset="1" stop-color="#09090b" stop-opacity="1"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#09090b"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- logo + wordmark -->
  <svg x="96" y="104" width="76" height="76" viewBox="0 0 128 128">${logoInner}</svg>
  <text x="192" y="158" font-family="${font}" font-size="30" font-weight="600" fill="#a1a1aa">open-source chrome extension</text>

  <text x="92" y="292" font-family="${font}" font-size="92" font-weight="700" letter-spacing="-3" fill="url(#title)">Open Autofill</text>
  <text x="96" y="364" font-family="${font}" font-size="34" fill="#a1a1aa">Fill any form in one click.</text>

  ${chipSvg}

  <text x="96" y="548" font-family="${font}" font-size="18" fill="#71717a">MIT licensed  ·  100% local  ·  Manifest V3</text>
  <text x="96" y="578" font-family="'Consolas', monospace" font-size="17" fill="#8b5cf6">github.com/harshilsureja/open-autofill</text>
</svg>`;

/** A screenshot in a rounded, bordered frame, rotated slightly. */
async function framedShot(file, width, angle) {
  const shotPath = path.join(root, 'docs', 'assets', 'screens', file);
  const meta = await sharp(shotPath).metadata();
  const height = Math.round((width * meta.height) / meta.width);
  const pad = 8;
  const radius = 18;

  const shot = await sharp(shotPath)
    .resize(width)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius - 4}" fill="#fff"/></svg>`
        ),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  const fw = width + pad * 2;
  const fh = height + pad * 2;
  const frame = Buffer.from(`
    <svg width="${fw}" height="${fh}">
      <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#26262b"/><stop offset="1" stop-color="#121215"/>
      </linearGradient></defs>
      <rect x="0.5" y="0.5" width="${fw - 1}" height="${fh - 1}" rx="${radius}" fill="url(#f)" stroke="#ffffff" stroke-opacity="0.16"/>
    </svg>`);

  return sharp(frame)
    .composite([{ input: shot, left: pad, top: pad }])
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

const back = await framedShot('saved-dark.png', 290, 7);
const front = await framedShot('page-light.png', 300, -5);

await sharp(Buffer.from(background))
  .composite([
    { input: back, left: 960, top: 70 },
    { input: front, left: 760, top: 110 },
    // fade the bottom of the screenshots into the background
    {
      input: Buffer.from(
        `<svg width="${W}" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#09090b" stop-opacity="0"/><stop offset="1" stop-color="#09090b"/></linearGradient></defs><rect x="640" width="640" height="200" fill="url(#g)"/></svg>`
      ),
      left: 0,
      top: H - 200,
    },
  ])
  .png()
  .toFile(path.join(root, 'docs', 'assets', 'social-preview.png'));

console.log('✓ docs/assets/social-preview.png');
