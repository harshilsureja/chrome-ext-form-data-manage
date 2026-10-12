// Packs dist/ into release/open-autofill-v<version>.zip, ready for the Chrome Web Store
// or a GitHub release. Run with: npm run zip
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(path.join(root, 'dist', 'manifest.json'), 'utf8'));
const outDir = path.join(root, 'release');
const out = path.join(outDir, `open-autofill-v${manifest.version}.zip`);

await mkdir(outDir, { recursive: true });
const zip = new AdmZip();
zip.addLocalFolder(path.join(root, 'dist')); // manifest.json at the zip root
zip.writeZip(out);
console.log(`✓ ${path.relative(root, out)}`);
