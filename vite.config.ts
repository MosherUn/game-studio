import { defineConfig } from 'vite';

export default defineConfig({
  base: '/game-studio/',
  server: {
    port: 6010,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});