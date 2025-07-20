import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend/public',
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  }
});
