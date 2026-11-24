/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Modalità di build:
// - normale:   `npm run build`          → dist/ (da pubblicare su un sito)
// - single:    `npm run build:single`   → dist-single/index.html, un unico file da aprire con doppio clic
// - artifact:  `npm run build:artifact` → dist-artifact/, versione per le pagine claude.ai
export default defineConfig(({ mode }) => {
  const single = mode === 'single' || mode === 'artifact';
  return {
    base: './',
    plugins: single ? [react(), viteSingleFile()] : [react()],
    build: { outDir: mode === 'single' ? 'dist-single' : mode === 'artifact' ? 'dist-artifact' : 'dist' },
    test: { environment: 'node' },
  };
});
