import MCR from 'monocart-coverage-reports';
import coverageOptions from './mcr.config';

async function globalSetup() {
  const mcr = MCR(coverageOptions);
  await mcr.cleanCache();
}

export default globalSetup;
