import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // The client and every extension must share one copy of the contract and
    // of React. A second copy of the contract brings a second HostProvider
    // context, which the client never fills, so an extension page throws.
    dedupe: [
      '@into-cps-association/dtaas-sdk',
      'react',
      'react-dom',
      'react-router-dom',
    ],
  },
  // The contract is linked from sdk/, and Vite does not pre-bundle a linked
  // package. bim-kit, which is pre-bundled, would then carry its own copy of
  // the contract in the dev server, with a second HostProvider context that
  // the client never fills. Pre-bundling the contract too gives both one copy.
  optimizeDeps: {
    include: [
      '@into-cps-association/dtaas-sdk',
      '@into-cps-association/dtaas-sdk/schema',
    ],
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
