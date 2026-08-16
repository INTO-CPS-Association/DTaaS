import { defineConfig } from 'tsup';

export default defineConfig({
  format: ['esm'],
  entry: ['index.ts'],
  dts: false,
  clean: true,
});
