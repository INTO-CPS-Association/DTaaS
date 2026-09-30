import Insights from 'route/insights/Insights';
import store from 'store/store';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
}));

describe('Insights', () => {
  function renderPage() {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Insights />
        </MemoryRouter>
      </Provider>,
    );
  }

  it('Carries the Insights heading', () => {
    renderPage();

    expect(
      screen.getAllByRole('heading', { level: 1, name: 'Insights' }).length,
    ).toBeGreaterThan(0);
  });

  it('Links to the logs and the configuration check, in this tab', () => {
    renderPage();

    const logs = screen.getByRole('link', { name: /Logs/ });
    expect(logs).toHaveAttribute('href', '/insights/log');
    expect(logs).not.toHaveAttribute('target');

    const config = screen.getByRole('link', { name: /Config/ });
    expect(config).toHaveAttribute('href', '/insights/config');
    expect(config).not.toHaveAttribute('target');
  });
});
