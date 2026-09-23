import InsightsConfig from 'route/insights/InsightsConfig';
import store from 'store/store';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import * as configUtil from 'util/configUtil';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
}));

jest.mock('util/configUtil', () => ({
  ...jest.requireActual('util/configUtil'),
  getValidationResults: jest.fn(),
}));

describe('InsightsConfig', () => {
  it('Shows the user check inside the application, without a sign-in link', async () => {
    (configUtil.getValidationResults as jest.Mock).mockResolvedValueOnce({
      API_URL: { value: 'http://localhost', status: 200 }, // NOSONAR
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <InsightsConfig />
        </MemoryRouter>
      </Provider>,
    );

    expect(
      screen.getAllByRole('heading', { level: 1, name: 'Config' }).length,
    ).toBeGreaterThan(0);
    expect(
      await screen.findByText('Configuration appears to be valid.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Return to login' }),
    ).not.toBeInTheDocument();
  });
});
