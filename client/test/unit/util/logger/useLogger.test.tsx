import { render, act, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authSlice from 'store/auth.slice';
import settingsSlice, {
  DEFAULT_MEASUREMENT,
  DEFAULT_SETTINGS,
} from 'store/settings.slice';
import {
  MAX_LOG_CONTEXT_DEPTH,
  MAX_LOG_CONTEXT_ENTRIES,
} from 'util/logger/contextUtils';
import type { LogContext } from 'util/logger/logEvent';

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

  it('retries initialization on a later render after failure', async () => {
    (logger.initLogger as jest.Mock)
      .mockRejectedValueOnce(new Error('hashing unavailable'))
      .mockResolvedValueOnce(undefined);
    const store = createTestStore('alice');

    const { rerender } = renderWithProviders(<TestComponent />, store);

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    rerender(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/']}>
          <TestComponent />
        </MemoryRouter>
      </Provider>,
    );

    await waitFor(() => {
      expect(logger.initLogger).toHaveBeenCalledTimes(2);
    });
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
          data-logger-capture-value="true"
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
      context: { value: 'abc' },
    });
  });

  it('records values from textarea and select form controls', async () => {
    const store = createTestStore('alice');

    function TestWithTextareaAndSelect() {
      useLogger();
      return (
        <>
          <textarea
            data-logger-element="textarea"
            data-logger-label="TestArea"
            data-logger-capture-value="true"
            defaultValue=""
          />
          <select
            data-logger-element="select"
            data-logger-label="TestSelect"
            data-logger-capture-value="true"
            defaultValue="alpha"
          >
            <option value="alpha">alpha</option>
            <option value="beta">beta</option>
          </select>
        </>
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(<TestWithTextareaAndSelect />, store);
      container = result.container;
    });

    const textarea = container!.querySelector('textarea')!;
    act(() => {
      fireEvent.change(textarea, { target: { value: 'some notes' } });
    });

    expect(logger.log).toHaveBeenCalledWith({
      event: 'change',
      page: expect.any(String),
      element: 'textarea',
      label: 'TestArea',
      context: { value: 'some notes' },
    });

    const select = container!.querySelector('select')!;
    act(() => {
      fireEvent.change(select, { target: { value: 'beta' } });
    });

    expect(logger.log).toHaveBeenCalledWith({
      event: 'change',
      page: expect.any(String),
      element: 'select',
      label: 'TestSelect',
      context: { value: 'beta' },
    });
  });

  it('does not record a value for change events on non-form elements', async () => {
    const store = createTestStore('alice');

    function TestWithDiv() {
      useLogger();
      return (
        <div
          data-logger-element="widget"
          data-logger-label="TestWidget"
          data-logger-capture-value="true"
        >
          content
        </div>
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(<TestWithDiv />, store);
      container = result.container;
    });

    const widget = container!.querySelector('div[data-logger-element]')!;
    act(() => {
      fireEvent.change(widget);
    });

    expect(logger.log).toHaveBeenCalledWith({
      event: 'change',
      page: expect.any(String),
      element: 'widget',
      label: 'TestWidget',
      context: {},
    });
  });

  it('does not record a value when capture-value opt-in is absent', async () => {
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

  it('records the checked state for checkbox change events', async () => {
    const store = createTestStore('alice');

    function TestWithCheckbox() {
      useLogger();
      return (
        <input
          type="checkbox"
          data-logger-element="checkbox"
          data-logger-label="TestCheckbox"
          data-logger-capture-value="true"
        />
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(<TestWithCheckbox />, store);
      container = result.container;
    });

    const checkbox = container!.querySelector('input')!;
    act(() => {
      fireEvent.click(checkbox);
    });

    expect(logger.log).toHaveBeenCalledWith({
      event: 'change',
      page: expect.any(String),
      element: 'checkbox',
      label: 'TestCheckbox',
      context: { value: 'true' },
    });
  });

  it('does not record values from password inputs', async () => {
    const store = createTestStore('alice');

    function TestWithPassword() {
      useLogger();
      return (
        <input
          type="password"
          data-logger-element="input"
          data-logger-label="TestPassword"
          data-logger-capture-value="true"
        />
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(<TestWithPassword />, store);
      container = result.container;
    });

    const input = container!.querySelector('input')!;
    act(() => {
      fireEvent.change(input, { target: { value: 'secret' } });
    });

    expect(logger.log).toHaveBeenCalledWith({
      event: 'change',
      page: expect.any(String),
      element: 'input',
      label: 'TestPassword',
      context: {},
    });
  });

  it('falls back to an empty context when data-logger-context is malformed', async () => {
    const store = createTestStore('alice');

    function TestWithBadContext() {
      useLogger();
      return (
        <button
          data-logger-element="button"
          data-logger-label="TestBtn"
          data-logger-context="{not valid json"
        >
          Click me
        </button>
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(<TestWithBadContext />, store);
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
      context: {},
    });
  });

  it('bounds context parsed from data-logger-context attributes', async () => {
    const store = createTestStore('alice');
    const wideContext = Object.fromEntries(
      Array.from({ length: MAX_LOG_CONTEXT_ENTRIES + 5 }, (_, index) => [
        `key${index}`,
        index,
      ]),
    );
    let deepContext: LogContext = { value: 'hidden' };
    for (let index = 0; index < MAX_LOG_CONTEXT_DEPTH + 3; index += 1) {
      deepContext = { child: deepContext };
    }

    function TestWithLargeContext() {
      useLogger();
      return (
        <>
          <button
            data-logger-element="button"
            data-logger-label="Wide"
            data-logger-context={JSON.stringify(wideContext)}
          >
            Wide
          </button>
          <button
            data-logger-element="button"
            data-logger-label="Deep"
            data-logger-context={JSON.stringify(deepContext)}
          >
            Deep
          </button>
        </>
      );
    }

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(<TestWithLargeContext />, store);
      container = result.container;
    });

    const [wideButton, deepButton] = Array.from(
      container!.querySelectorAll('button'),
    );
    act(() => {
      fireEvent.click(wideButton);
      fireEvent.click(deepButton);
    });

    const mockLog = logger.log as jest.MockedFunction<typeof logger.log>;

    expect(Object.keys(mockLog.mock.calls[0][0].context ?? {})).toHaveLength(
      MAX_LOG_CONTEXT_ENTRIES,
    );
    expect(JSON.stringify(mockLog.mock.calls[1][0].context)).toContain(
      '[context depth limit reached]',
    );
    expect(JSON.stringify(mockLog.mock.calls[1][0].context)).not.toContain(
      'hidden',
    );
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
