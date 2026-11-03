import { act, render, screen } from '@testing-library/react';
import createFakeSignals from 'src/testing/fakeSignals';
import type { SignalSample } from 'src/index';

const sample = (
  ts: number,
  value: number,
  overrides: Partial<SignalSample> = {},
): SignalSample => ({
  twinId: 'j7',
  signalPath: 'j7/queue',
  channel: 'measured',
  ts,
  value,
  ...overrides,
});

describe('createFakeSignals', () => {
  it('delivers samples to matching subscribers only', () => {
    const signals = createFakeSignals();
    const received: number[] = [];
    signals.subscribe(['j7/queue'], 'measured', (s) =>
      received.push(s.value as number),
    );
    signals.emit(
      sample(1, 10),
      sample(2, 20, { channel: 'simulated' }),
      sample(3, 30, { signalPath: 'j7/other' }),
    );
    expect(received).toEqual([10]);
  });

  it('stops delivering after unsubscribe', () => {
    const signals = createFakeSignals();
    const sink = jest.fn();
    const unsubscribe = signals.subscribe(['j7/queue'], 'measured', sink);
    unsubscribe();
    signals.emit(sample(1, 10));
    expect(sink).not.toHaveBeenCalled();
  });

  describe('valueAt', () => {
    it('returns undefined when there are no samples', () => {
      expect(
        createFakeSignals().valueAt('j7/queue', 'measured', 5),
      ).toBeUndefined();
    });

    it('returns undefined before the first sample', () => {
      const signals = createFakeSignals();
      signals.emit(sample(10, 1));
      expect(signals.valueAt('j7/queue', 'measured', 9)).toBeUndefined();
    });

    it('returns the latest sample at or before t, even if emitted out of order', () => {
      const signals = createFakeSignals();
      signals.emit(
        sample(30, 3),
        sample(10, 1, { quality: 'stale' }),
        sample(20, 2),
      );
      expect(signals.valueAt('j7/queue', 'measured', 25)).toEqual({
        value: 2,
        ts: 20,
      });
      expect(signals.valueAt('j7/queue', 'measured', 10)).toEqual({
        value: 1,
        ts: 10,
        quality: 'stale',
      });
    });

    it('reads at the playhead when t is omitted', () => {
      const signals = createFakeSignals();
      signals.emit(sample(10, 1), sample(20, 2));
      signals.playhead.set(15);
      expect(signals.valueAt('j7/queue', 'measured')?.value).toBe(1);
    });
  });

  it('returns a time range across paths, inclusive and sorted', async () => {
    const signals = createFakeSignals();
    signals.emit(
      sample(5, 0),
      sample(30, 3),
      sample(10, 1),
      sample(20, 2, { signalPath: 'j7/b' }),
    );
    const range = await signals.range(['j7/queue', 'j7/b'], 'measured', 10, 20);
    expect(range.map((s) => s.ts)).toEqual([10, 20]);
    expect(signals.samples()).toHaveLength(4);
  });

  describe('playhead', () => {
    it('follows the clock while live and stops when set', () => {
      let now = 100;
      const signals = createFakeSignals({ now: () => now });
      expect(signals.playhead.get()).toBe(100);
      now = 200;
      expect(signals.playhead.get()).toBe(200);
      signals.playhead.set(50);
      now = 300;
      expect(signals.playhead.get()).toBe(50);
      signals.playhead.follow(true);
      expect(signals.playhead.get()).toBe(300);
      signals.playhead.follow(false);
      now = 400;
      expect(signals.playhead.get()).toBe(300);
    });

    it('re-renders components that use the playhead', () => {
      const signals = createFakeSignals({ now: () => 0 });
      function Clock() {
        return <p>t={signals.playhead.use()}</p>;
      }
      render(<Clock />);
      act(() => signals.playhead.set(42));
      expect(screen.getByText('t=42')).toBeInTheDocument();
    });
  });

  describe('connection', () => {
    it('starts live and is set through setConnection', () => {
      const signals = createFakeSignals();
      expect(signals.connection.get()).toBe('live');
      signals.setConnection('down', ['j7/queue']);
      expect(signals.connection.get(['j7/queue'])).toBe('down');
    });
  });

  it('searches and gets registry entities', async () => {
    const signals = createFakeSignals({
      entities: [
        { id: 'd1', name: 'AHU 1', type: 'DEVICE' },
        { id: 'a1', name: 'Ward 3', type: 'ASSET', label: 'ahu wing' },
      ],
    });
    expect((await signals.registry.search('ahu')).map((e) => e.id)).toEqual([
      'd1',
      'a1',
    ]);
    expect((await signals.registry.get('a1')).name).toBe('Ward 3');
    await expect(signals.registry.get('zz')).rejects.toThrow(
      'No such entity: zz',
    );
  });
});
