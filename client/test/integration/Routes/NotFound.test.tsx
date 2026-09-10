import { screen } from '@testing-library/react';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';

const UNKNOWN_PATHS = ['/workbenchs', '/missing-workspace/tree/digital_twins'];

describe('Unknown routes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(UNKNOWN_PATHS)(
    'keeps the layout when opening %s directly',
    async (path) => {
      await setupIntegrationTest(path);

      expect(screen.getByRole('banner')).toBeVisible();
      expect(screen.getByRole('contentinfo')).toBeVisible();
      expect(screen.getByText(path)).toBeVisible();
      expect(
        screen.getByRole('heading', { name: /This Page Does Not Exist/i }),
      ).toBeVisible();
    },
  );

  it.each(UNKNOWN_PATHS)(
    'omits the layout when opening %s in a frame',
    async (path) => {
      jest
        .spyOn(globalThis, 'self', 'get')
        .mockReturnValue({} as Window & typeof globalThis);
      await setupIntegrationTest(path);

      expect(screen.getByText(path)).toBeVisible();
      expect(
        screen.getByRole('heading', { name: /This Page Does Not Exist/i }),
      ).toBeVisible();
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
      expect(
        screen.queryByText('DTaaS - Digital Twin as a Service'),
      ).not.toBeInTheDocument();
    },
  );
});
