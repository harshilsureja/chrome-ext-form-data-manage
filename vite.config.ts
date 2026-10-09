import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Builds the side panel into dist/. Everything in public/ (manifest, background,
// content script, icons) is copied as-is, so load dist/ as the unpacked extension.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { sidepanel: path.resolve(import.meta.dirname, 'sidepanel.html') },
    },
  },
});
