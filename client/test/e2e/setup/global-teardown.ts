import MCR from 'monocart-coverage-reports';
import coverageOptions from './mcr.config';

async function globalTeardown() {
  const mcr = MCR(coverageOptions);
  await mcr.generate();
}

export default globalTeardown;
