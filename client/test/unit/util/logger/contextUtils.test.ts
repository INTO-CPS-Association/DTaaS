import {
  collectLogContextText,
  flattenLogContext,
  MAX_LOG_CONTEXT_DEPTH,
  MAX_LOG_CONTEXT_ENTRIES,
  sanitizeLogContext,
} from 'util/logger/contextUtils';
import type { LogContext } from 'util/logger/logEvent';

function nestedContext(depth: number): LogContext {
  let context: LogContext = { final: 'hidden' };
  for (let index = 0; index < depth; index += 1) {
    context = { child: context };
  }
  return context;
}

describe('contextUtils', () => {
  it('caps sanitized context recursion depth', () => {
    const sanitized = sanitizeLogContext(
      nestedContext(MAX_LOG_CONTEXT_DEPTH + 3),
    );
    const flattened = flattenLogContext(sanitized);

    expect(flattened).toEqual([
      {
        key: 'child.child.child.child.child.child',
        value: '[context depth limit reached]',
      },
    ]);
  });

  it('caps sanitized context entries', () => {
    const wideContext = Object.fromEntries(
      Array.from({ length: MAX_LOG_CONTEXT_ENTRIES + 5 }, (_, index) => [
        `key${index}`,
        index,
      ]),
    );

    expect(Object.keys(sanitizeLogContext(wideContext))).toHaveLength(
      MAX_LOG_CONTEXT_ENTRIES,
    );
  });

  it('bounds flattened context entries', () => {
    const wideContext = Object.fromEntries(
      Array.from({ length: MAX_LOG_CONTEXT_ENTRIES + 5 }, (_, index) => [
        `key${index}`,
        index,
      ]),
    );

    expect(flattenLogContext(wideContext)).toHaveLength(
      MAX_LOG_CONTEXT_ENTRIES,
    );
  });

  it('bounds context text collection through arrays', () => {
    const context = {
      values: Array.from(
        { length: MAX_LOG_CONTEXT_ENTRIES + 5 },
        (_, index) => `value${index}`,
      ),
    };

    expect(collectLogContextText(context)).not.toContain(
      `value${MAX_LOG_CONTEXT_ENTRIES + 4}`,
    );
  });
});
