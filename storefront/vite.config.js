import { defineConfig } from 'vite';
import { resolve } from 'path';
import glob from 'fast-glob';

// Auto-pick every HTML file under /src
const htmlFiles = glob.sync('./src/**/*.html');

export default defineConfig({
  base: './',
  root: resolve(__dirname, 'src'),
  server: { host: true, port: 3100, open: true },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: htmlFiles.length
        ? Object.fromEntries(
            htmlFiles.map((f) => [
              f.replace(/^\.\/src\//, '').replace(/\.html$/, ''),
              resolve(__dirname, f),
            ])
          )
        : resolve(__dirname, 'src/index.html'),
      output: {
        chunkFileNames: 'assets/js/[name].js',
        entryFileNames: 'assets/js/[name].js',
        assetFileNames: ({ name }) => {
          if (/\.(gif|jpe?g|png|svg|webp)$/.test(name ?? '')) return 'assets/images/[name][extname]';
          if (/\.css$/.test(name ?? '')) return 'assets/css/[name][extname]';
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
