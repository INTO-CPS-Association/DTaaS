import { defineConfig } from 'tsup';

export default defineConfig({
  format: ['esm'],
  entry: ['index.ts'],
  platform: 'neutral',
  removeNodeProtocol: false,
  dts: false,
  clean: true,
});
