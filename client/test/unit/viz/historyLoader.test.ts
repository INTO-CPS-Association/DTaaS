import type { SignalSample } from '@into-cps-association/dtaas-sdk';
import createHistoryCoverage from 'viz/historyCoverage';
import createHistoryLoader, { MAX_SPAN_MS } from 'viz/historyLoader';
import createSampleStore from 'viz/sampleStore';

const sample = (path: string, ts: number, value: number): SignalSample => ({
  twinId: '',
  signalPath: path,
  channel: 'measured',
  ts,
  value,
});

function loaderWith(range: jest.Mock) {
  const store = createSampleStore();
  const coverage = createHistoryCoverage();
  return {
    store,
    coverage,
    loader: createHistoryLoader({ range }, store, coverage),
  };
}

describe('the history loader', () => {
  it('reads the gaps into the store once, for every path that shares them', async () => {
    const range = jest.fn(async () => ({
      samples: [sample('a', 5, 1), sample('b', 6, 2)],
      truncated: false,
    }));
    const { store, loader } = loaderWith(range);

    await loader.load(['a', 'b'], 'measured', 0, 10);
    await loader.load(['a', 'b'], 'measured', 2, 8);

    expect(range).toHaveBeenCalledTimes(1);
    expect(range).toHaveBeenCalledWith(['a', 'b'], 'measured', 0, 10);
    expect(store.valueAt('b', 'measured', 9)?.value).toBe(2);
  });

  it('asks only for the part of a window it does not hold', async () => {
    const range = jest.fn(async () => ({ samples: [], truncated: false }));
    const { coverage, loader } = loaderWith(range);
    coverage.add('measured a', 50, Infinity);

    await loader.load(['a'], 'measured', 0, 100);

    expect(range).toHaveBeenCalledWith(['a'], 'measured', 0, 50);
  });

  it('asks again for a window whose read failed', async () => {
    const range = jest
      .fn()
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue({ samples: [], truncated: false });
    const { loader } = loaderWith(range);

    await expect(loader.load(['a'], 'measured', 0, 10)).rejects.toThrow('503');
    await loader.load(['a'], 'measured', 0, 10);

    expect(range).toHaveBeenCalledTimes(2);
  });

  it('waits for a read that is running instead of asking twice', async () => {
    const range = jest.fn(async () => ({ samples: [], truncated: false }));
    const { loader } = loaderWith(range);

    await Promise.all([
      loader.load(['a'], 'measured', 0, 10),
      loader.load(['a'], 'measured', 0, 10),
    ]);

    expect(range).toHaveBeenCalledTimes(1);
  });

  it('asks for at most seven days and says that older samples are left out', async () => {
    const range = jest.fn(async () => ({ samples: [], truncated: false }));
    const { loader } = loaderWith(range);
    const to = 2 * MAX_SPAN_MS;

    await loader.load(['a'], 'measured', 0, to);

    expect(range).toHaveBeenCalledWith(['a'], 'measured', to - MAX_SPAN_MS, to);
    expect(loader.truncated()).toBe(true);
  });

  it('follows whether the last answer of the gateway was cut short', async () => {
    const range = jest
      .fn()
      .mockResolvedValueOnce({ samples: [], truncated: true })
      .mockResolvedValueOnce({ samples: [], truncated: false });
    const { loader } = loaderWith(range);

    await loader.load(['a'], 'measured', 0, 10);
    expect(loader.truncated()).toBe(true);
    await loader.load(['a'], 'measured', 20, 30);
    expect(loader.truncated()).toBe(false);
  });

  it('asks each instant once when the window moves while reads are pending', async () => {
    const answers: (() => void)[] = [];
    const range = jest.fn(
      (_paths: string[], _channel: string, _from: number, _to: number) =>
        new Promise((resolve) => {
          answers.push(() => resolve({ samples: [], truncated: false }));
        }),
    );
    const { loader } = loaderWith(range);
    const minute = 60_000;
    const end = 100 * minute;

    // Seven moves of the window, a minute further back each, before any answer.
    const loads = [1, 2, 3, 4, 5, 6, 7].map((k) =>
      loader.load(['a'], 'measured', end - k * minute, end),
    );
    answers.forEach((answer) => answer());
    await Promise.all(loads);

    const asked = range.mock.calls.map((call) => [call[2], call[3]]);
    expect(asked).toEqual(
      [1, 2, 3, 4, 5, 6, 7].map((k) => [
        end - k * minute,
        end - (k - 1) * minute,
      ]),
    );
    await loader.load(['a'], 'measured', end - 7 * minute, end);
    expect(range).toHaveBeenCalledTimes(7);
  });
});
