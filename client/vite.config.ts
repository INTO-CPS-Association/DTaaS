import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // bim-kit 0.2.0 was published against the contract's former name,
    // @into-cps-association/dtaas-sdk. The alias hands it the same local copy
    // the client uses, until a bim-kit release imports the new name.
    alias: [
      {
        find: /^@into-cps-association\/dtaas-sdk(\/.*)?$/,
        replacement: '@into-cps-association/dtaas-extensions$1',
      },
    ],
  },
  // The contract is linked from sdk/, and Vite does not pre-bundle a linked
  // package. bim-kit, which is pre-bundled, would then carry its own copy of
  // the contract in the dev server, with a second HostProvider context that
  // the client never fills. Pre-bundling the contract too gives both one copy.
  optimizeDeps: {
    include: [
      '@into-cps-association/dtaas-extensions',
      '@into-cps-association/dtaas-extensions/schema',
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
