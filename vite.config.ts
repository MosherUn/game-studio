import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    port: 6010,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});