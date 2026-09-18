import DigitalTwinsPreview from 'route/digitaltwins/DigitalTwinsPreview';
import store from 'store/store';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
}));

describe('Digital Twins', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('displays content of tabs', async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <MemoryRouter>
            <DigitalTwinsPreview />
          </MemoryRouter>
        </Provider>,
      );
    });

    // Fast-forward timers and wait for state updates
    await act(async () => {
      jest.runAllTimers();
    });

    const tabComponent = screen.getByTestId('tab-component');
    expect(tabComponent).toBeInTheDocument();
  });

  it('carries the page heading, as the digital twins page it mirrors does', async () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <DigitalTwinsPreview />
        </MemoryRouter>
      </Provider>,
    );
    // The timers still need one, because advancing them updates state.
    await act(async () => {
      jest.runAllTimers();
    });

    expect(
      screen.getAllByRole('heading', {
        level: 1,
        name: 'Digital Twins Page',
      }).length,
    ).toBeGreaterThan(0);
  });
});
