import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets work on any repo path (e.g. /nutrivision-ai/)
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});