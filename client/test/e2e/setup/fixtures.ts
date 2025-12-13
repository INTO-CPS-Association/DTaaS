import { test as testBase } from '@playwright/test';
import MCR from 'monocart-coverage-reports';
import coverageOptions from 'test/e2e/setup/mcr.config';

// fixtures
const test = testBase.extend<{
  autoTestFixture: string;
}>({
  autoTestFixture: [
    async ({ page }, use) => {
      const isChromium = test.info().project.name === 'chromium';

      // console.log('autoTestFixture setup...');
      // coverage API is chromium only
      if (isChromium) {
        await Promise.all([
          page.coverage.startJSCoverage({
            resetOnNavigation: false,
          }),
          page.coverage.startCSSCoverage({
            resetOnNavigation: false,
          }),
        ]);
      }

      await use('autoTestFixture');

      // console.log('autoTestFixture teardown...');
      if (isChromium) {
        try {
          const [jsCoverage, cssCoverage] = await Promise.all([
            page.coverage.stopJSCoverage(),
            page.coverage.stopCSSCoverage(),
          ]);
          const coverageList = [...jsCoverage, ...cssCoverage];
          // console.log(coverageList.map((item) => item.url));
          const mcr = MCR(coverageOptions);
          await mcr.add(coverageList);
        } catch (error) {
          // Log the error but don't fail the test
          // eslint-disable-next-line no-console
          console.warn('Failed to collect coverage:', error);
        }
      }
    },
    {
      scope: 'test',
      auto: true,
    },
  ],
});

export default test;
