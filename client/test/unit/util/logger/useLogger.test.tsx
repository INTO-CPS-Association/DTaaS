import { render, act, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authSlice from 'store/auth.slice';

let capturedInitCall: string | null = null;

jest.mock('util/logger/useLogger', () =>
  jest.requireActual('util/logger/useLogger'),
);

jest.mock('react-redux', () => jest.requireActual('react-redux'));

jest.mock('util/logger/logger', () => ({
  initLogger: jest.fn((username: string) => {
    capturedInitCall = username;
    return Promise.resolve();
  }),
  isLoggerInitialized: jest.fn().mockReturnValue(true),
  log: jest.fn(),
  resetLogger: jest.fn(),
}));

// eslint-disable-next-line import/first
import * as logger from 'util/logger/logger';
// eslint-disable-next-line import/first
import { useLogger } from 'util/logger/useLogger';

function TestComponent() {
  useLogger();
  return (
    <button
      data-logger-element="button"
      data-logger-label="TestBtn"
      data-logger-context='{"action":"test"}'
    >
      Click me
    </button>
  );
}

const createTestStore = (userName?: string) =>
  configureStore({
    reducer: combineReducers({ auth: authSlice }),
    preloadedState: { auth: { userName } },
  });

describe('useLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedInitCall = null;
    (logger.initLogger as jest.Mock).mockImplementation((username: string) => {
      capturedInitCall = username;
      return Promise.resolve();
    });
    (logger.isLoggerInitialized as jest.Mock).mockReturnValue(true);
  });

  it('initializes the logger when username is available', async () => {
    const store = createTestStore('alice');

    render(
      <Provider store={store}>
        <TestComponent />
      </Provider>,
    );

    await waitFor(() => {
      expect(capturedInitCall).toBe('alice');
    });
  });

  it('does not initialize without a username', async () => {
    const store = createTestStore(undefined);

    await act(async () => {
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );
    });

    expect(logger.initLogger).not.toHaveBeenCalled();
  });

  it('initializes from sessionStorage username when Redux username is missing', async () => {
    const store = createTestStore(undefined);
    sessionStorage.setItem('username', 'session-user');

    render(
      <Provider store={store}>
        <TestComponent />
      </Provider>,
    );

    await waitFor(() => {
      expect(capturedInitCall).toBe('session-user');
    });
  });

  it('logs clicks on elements with data-logger attributes', async () => {
    const store = createTestStore('alice');

    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );
      container = result.container;
    });

    const button = container!.querySelector('button')!;
    act(() => {
      fireEvent.click(button);
    });

    expect(logger.log).toHaveBeenCalledWith(
      expect.any(String),
      'button',
      'TestBtn',
      { action: 'test' },
    );
  });

  it('does not log clicks on elements without data-logger attributes', async () => {
    const store = createTestStore('alice');

    function TestWithPlainBtn() {
      useLogger();
      return <button>No tracking</button>;
    }

    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <Provider store={store}>
          <TestWithPlainBtn />
        </Provider>,
      );
      container = result.container;
    });

    const button = container!.querySelector('button')!;
    act(() => {
      fireEvent.click(button);
    });

    expect(logger.log).not.toHaveBeenCalled();
  });
});
