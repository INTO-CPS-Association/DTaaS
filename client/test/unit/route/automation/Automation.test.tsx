import Automation from 'route/automation/Automation';
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

describe('Automation', () => {
  function renderPage() {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Automation />
        </MemoryRouter>
      </Provider>,
    );
  }

  it('carries the Automation heading', () => {
    renderPage();

    expect(
      screen.getAllByRole('heading', { level: 1, name: 'Automation' }).length,
    ).toBeGreaterThan(0);
  });

  it('links to the library and digital twins previews, in this tab', () => {
    renderPage();

    const library = screen.getByRole('link', { name: /Library/ });
    expect(library).toHaveAttribute('href', '/preview/library');
    // No new tab: a new tab starts with an empty sessionStorage, where the OIDC
    // session lives, so the route guard would bounce the person to sign in.
    expect(library).not.toHaveAttribute('target');

    const digitalTwins = screen.getByRole('link', { name: /Digital Twins/ });
    expect(digitalTwins).toHaveAttribute('href', '/preview/digitaltwins');
    expect(digitalTwins).not.toHaveAttribute('target');
  });

  it('does not name either card a preview', () => {
    renderPage();

    // The cards are labelled by their destination, not by how they were first
    // introduced, so neither link carries the word "Preview".
    expect(screen.queryByRole('link', { name: /Preview/i })).toBeNull();
  });
});
