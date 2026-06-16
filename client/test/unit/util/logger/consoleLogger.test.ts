import {
  logToConsole,
  getLogBuffer,
  clearLogBuffer,
  downloadLogs,
} from 'util/logger/consoleLogger';
import { LogEvent } from 'util/logger/logEvent';

const mockEvent: LogEvent = {
  sessionId: 'sess-1',
  userHash: 'hash-1',
  timestamp: '2026-03-24T20:00:00.000Z',
  event: 'click',
  page: '/library',
  element: 'tab',
  label: 'Functions',
  context: {},
};

describe('consoleLogger', () => {
  beforeEach(() => {
    clearLogBuffer();
    globalThis.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds event to in-memory buffer', () => {
    logToConsole(mockEvent);
    expect(getLogBuffer()).toEqual([mockEvent]);
  });

  it('adds events to the buffer', () => {
    logToConsole(mockEvent);
    logToConsole(mockEvent);
    expect(getLogBuffer()).toHaveLength(2);
  });

  it('clears the buffer', () => {
    logToConsole(mockEvent);
    clearLogBuffer();
    expect(getLogBuffer()).toHaveLength(0);
  });

  it('downloads logs as a JSONL file', () => {
    logToConsole(mockEvent);

    const mockClick = jest.fn();
    const mockAppendChild = jest.spyOn(document.body, 'appendChild');
    const mockRemoveChild = jest.spyOn(document.body, 'removeChild');

    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === 'a') {
        el.click = mockClick;
      }
      return el;
    });

    downloadLogs();

    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();

    jest.restoreAllMocks();
  });
});
