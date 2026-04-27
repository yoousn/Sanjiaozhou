import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    watch: {
      ignored: [
        '**/scripts/**',
        '**/src/data.json',
      ],
    },
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
