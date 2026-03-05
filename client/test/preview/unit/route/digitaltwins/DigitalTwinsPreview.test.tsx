import DigitalTwinsPreview from 'preview/route/digitaltwins/DigitalTwinsPreview';
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
});
