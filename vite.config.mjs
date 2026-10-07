import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  root: 'frontend',
  plugins: [react()],
  build: {
    outDir: '../public', emptyOutDir: true, sourcemap: false,
    // Extensión ESM explícita: el builder NestJS de Vercel no debe convertir los bundles del navegador a CommonJS.
    rolldownOptions: { output: { entryFileNames: 'assets/[name]-[hash].mjs', chunkFileNames: 'assets/[name]-[hash].mjs' } },
  },
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
