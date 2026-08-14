import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: '0.0.0.0',
    port: 4000,
    open: true,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4000,
    strictPort: true,
    open: true,
  },
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 2500,
  },
});
