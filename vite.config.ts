import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  base: '/game-studio/',
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
  },
  plugins: [
    {
      name: 'copy-gameList',
      closeBundle() {
        const srcDir = resolve(__dirname, 'gameList');
        const destDir = resolve(__dirname, 'dist', 'gameList');
        if (fs.existsSync(srcDir)) {
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          const files = fs.readdirSync(srcDir);
          for (const file of files) {
            fs.copyFileSync(
              resolve(srcDir, file),
              resolve(destDir, file)
            );
          }
          console.log('✅ gameList 文件夹已复制到 dist');
        }
      }
    }
  ]
});