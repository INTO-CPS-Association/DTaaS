import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LogEntryCard from 'page/logViewer/LogEntryCard';
import {
  MAX_LOG_CONTEXT_DEPTH,
  MAX_LOG_CONTEXT_ENTRIES,
} from 'util/logger/contextUtils';
import { LogContext, LogEvent } from 'util/logger/logEvent';

const baseEntry: LogEvent = {
  sessionId: 'session-1',
  userHash: 'hash',
  timestamp: '2026-07-07T17:47:02.000Z',
  event: 'click',
  page: '/insights/log',
  element: 'button',
  label: 'Toggle Raw Logs',
  context: {},
};

describe('LogEntryCard', () => {
  it('flattens nested context values into dotted-path chips instead of stringifying objects', () => {
    render(
      <LogEntryCard
        entry={{
          ...baseEntry,
          context: { log: { button: 'toggle-raw-view', rawView: true } },
        }}
      />,
    );

    expect(screen.getByText('log.button: toggle-raw-view')).toBeInTheDocument();
    expect(screen.getByText('log.rawView: true')).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });

  it('renders array context values as JSON instead of stringifying them', () => {
    render(
      <LogEntryCard
        entry={{
          ...baseEntry,
          context: {
            dt: { name: 'hello', history: ['2026-07-07T00:00:00.000Z'] },
          },
        }}
      />,
    );

    expect(
      screen.getByText('dt.history: ["2026-07-07T00:00:00.000Z"]'),
    ).toBeInTheDocument();
  });

  it('shows the full context value in a tooltip when hovering a truncated chip', async () => {
    render(
      <LogEntryCard
        entry={{
          ...baseEntry,
          context: {
            dt: { history: ['2026-07-07T00:00:00.000Z'] },
          },
        }}
      />,
    );

    const chipText = 'dt.history: ["2026-07-07T00:00:00.000Z"]';
    const chipLabel = screen.getByText(chipText);
    Object.defineProperty(chipLabel, 'scrollWidth', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(chipLabel, 'clientWidth', {
      configurable: true,
      value: 100,
    });
    await userEvent.hover(chipLabel);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(chipText);
  });

  it('does not show a tooltip when the chip text is fully visible', async () => {
    render(
      <LogEntryCard entry={{ ...baseEntry, context: { value: 'enabled' } }} />,
    );

    await userEvent.hover(screen.getByText('value: enabled'));

    await expect(
      screen.findByRole('tooltip', {}, { timeout: 300 }),
    ).rejects.toThrow();
  });

  it('renders flat primitive context values unchanged', () => {
    render(
      <LogEntryCard entry={{ ...baseEntry, context: { value: 'enabled' } }} />,
    );

    expect(screen.getByText('value: enabled')).toBeInTheDocument();
  });

  it('bounds nested context rendering', () => {
    let context: LogContext = { value: 'hidden' };
    for (let index = 0; index < MAX_LOG_CONTEXT_DEPTH + 3; index += 1) {
      context = { child: context };
    }

    render(<LogEntryCard entry={{ ...baseEntry, context }} />);

    expect(
      screen.getByText(
        'child.child.child.child.child.child: [context depth limit reached]',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/hidden/)).not.toBeInTheDocument();
  });

  it('bounds wide context rendering', () => {
    const wideContext = Object.fromEntries(
      Array.from({ length: MAX_LOG_CONTEXT_ENTRIES + 5 }, (_, index) => [
        `key${index}`,
        index,
      ]),
    );

    render(<LogEntryCard entry={{ ...baseEntry, context: wideContext }} />);

    expect(screen.getByText('key0: 0')).toBeInTheDocument();
    expect(
      screen.queryByText(`key${MAX_LOG_CONTEXT_ENTRIES + 4}: 104`),
    ).toBeNull();
  });
});
