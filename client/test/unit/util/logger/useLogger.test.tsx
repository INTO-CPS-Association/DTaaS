import { render, act, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authSlice from 'store/auth.slice';
import settingsSlice, {
  DEFAULT_MEASUREMENT,
  DEFAULT_SETTINGS,
} from 'store/settings.slice';

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
  logNavigation: jest.fn(),
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

const createTestStore = (userName?: string, loggingEnabled = true) =>
  configureStore({
    reducer: combineReducers({ auth: authSlice, settings: settingsSlice }),
    preloadedState: {
      auth: { userName },
      settings: {
        ...DEFAULT_SETTINGS,
        ...DEFAULT_MEASUREMENT,
        loggingEnabled,
      },
    },
  });

function renderWithProviders(
  ui: React.ReactElement,
  store: ReturnType<typeof createTestStore>,
  initialPath = '/',
) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </Provider>,
  );
}

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

    renderWithProviders(<TestComponent />, store);

    await waitFor(() => {
      expect(capturedInitCall).toBe('alice');
    });
  });

  it('does not initialize without a username', async () => {
    const store = createTestStore(undefined);

    await act(async () => {
      renderWithProviders(<TestComponent />, store);
    });

    expect(logger.initLogger).not.toHaveBeenCalled();
  });

  it('does not initialize when logging is disabled', async () => {
    const store = createTestStore('alice', false);

    await act(async () => {
      renderWithProviders(<TestComponent />, store);
    });

    expect(logger.initLogger).not.toHaveBeenCalled();
  });

  it('initializes from sessionStorage username when Redux username is missing', async () => {
    const store = createTestStore(undefined);
    sessionStorage.setItem('username', 'session-user');

    renderWithProviders(<TestComponent />, store);

    await waitFor(() => {
      expect(capturedInitCall).toBe('session-user');
    });
  });

  it('logs clicks on elements with data-logger attributes', async () => {
    const store = createTestStore('alice');

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(<TestComponent />, store);
      container = result.container;
    });

    const button = container!.querySelector('button')!;
    act(() => {
      fireEvent.click(button);
    });

    expect(logger.log).toHaveBeenCalledWith({
      event: 'click',
      page: expect.any(String),
      element: 'button',
      label: 'TestBtn',
      context: { action: 'test' },
    });
  });

  it('logs change events on form controls with data-logger attributes', async () => {
    const store = createTestStore('alice');

    function TestWithInput() {
      useLogger();
      return (
        <input
          data-logger-element="input"
          data-logger-label="TestInput"
          defaultValue=""
        />
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(<TestWithInput />, store);
      container = result.container;
    });

    const input = container!.querySelector('input')!;
    act(() => {
      fireEvent.change(input, { target: { value: 'abc' } });
    });

    expect(logger.log).toHaveBeenCalledWith({
      event: 'change',
      page: expect.any(String),
      element: 'input',
      label: 'TestInput',
      context: {},
    });
  });

  it('does not log clicks on form controls', async () => {
    const store = createTestStore('alice');

    function TestWithInput() {
      useLogger();
      return (
        <input data-logger-element="input" data-logger-label="TestInput" />
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(<TestWithInput />, store);
      container = result.container;
    });

    const input = container!.querySelector('input')!;
    act(() => {
      fireEvent.click(input);
    });

    expect(logger.log).not.toHaveBeenCalled();
  });

  it('does not log clicks on elements without data-logger attributes', async () => {
    const store = createTestStore('alice');

    function TestWithPlainBtn() {
      useLogger();
      return <button>No tracking</button>;
    }

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(<TestWithPlainBtn />, store);
      container = result.container;
    });

    const button = container!.querySelector('button')!;
    act(() => {
      fireEvent.click(button);
    });

    expect(logger.log).not.toHaveBeenCalled();
  });

  it('does not log clicks when logging is disabled', async () => {
    const store = createTestStore('alice', false);

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(<TestComponent />, store);
      container = result.container;
    });

    const button = container!.querySelector('button')!;
    act(() => {
      fireEvent.click(button);
    });

    expect(logger.log).not.toHaveBeenCalled();
  });

  it('logs a navigation event for the current page when already initialized', async () => {
    const store = createTestStore('alice');

    await act(async () => {
      renderWithProviders(<TestComponent />, store, '/library');
    });

    expect(logger.logNavigation).toHaveBeenCalledWith('/library');
  });

  it('logs a navigation event once initialization completes', async () => {
    (logger.isLoggerInitialized as jest.Mock).mockReturnValue(false);
    const store = createTestStore('alice');

    renderWithProviders(<TestComponent />, store, '/digitaltwins');

    await waitFor(() => {
      expect(logger.logNavigation).toHaveBeenCalledWith('/digitaltwins');
    });
  });

  it('does not log a navigation event while uninitialized', async () => {
    (logger.isLoggerInitialized as jest.Mock).mockReturnValue(false);
    (logger.initLogger as jest.Mock).mockReturnValue(new Promise(() => {}));
    const store = createTestStore('alice');

    await act(async () => {
      renderWithProviders(<TestComponent />, store, '/library');
    });

    expect(logger.logNavigation).not.toHaveBeenCalled();
  });

  it('does not log navigation when logging is disabled', async () => {
    const store = createTestStore('alice', false);

    await act(async () => {
      renderWithProviders(<TestComponent />, store, '/library');
    });

    expect(logger.logNavigation).not.toHaveBeenCalled();
  });
});
