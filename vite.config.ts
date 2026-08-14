import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/game-studio/',  // ✅ 必须和仓库名一致
  server: {
    port: 6010,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        studio: resolve(__dirname, 'studio.html'),
        profile: resolve(__dirname, 'profile.html')
      }
    }
  }
});