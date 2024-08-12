import MCR from 'monocart-coverage-reports';
import coverageOptions from './mcr.config';
import { type FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  const mcr = MCR(coverageOptions);
  await mcr.generate();
}

export default globalTeardown;