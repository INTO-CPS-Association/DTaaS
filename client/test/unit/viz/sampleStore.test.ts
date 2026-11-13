import type { SignalSample } from '@into-cps-association/dtaas-sdk';
import createSampleStore from 'viz/sampleStore';

const sample = (ts: number, value: number, path = 'room/temp') =>
  ({
    twinId: '',
    signalPath: path,
    channel: 'measured',
    ts,
    value,
  }) as SignalSample;

describe('the sample store', () => {
  it('reads the latest sample at or before a time, whatever the arrival order', () => {
    const store = createSampleStore();
    [sample(30, 3), sample(10, 1), sample(20, 2)].forEach(store.insert);

    expect(store.valueAt('room/temp', 'measured', 5)).toBeUndefined();
    expect(store.valueAt('room/temp', 'measured', 10)?.value).toBe(1);
    expect(store.valueAt('room/temp', 'measured', 25)?.value).toBe(2);
    expect(store.valueAt('room/temp', 'measured', 99)?.value).toBe(3);
  });

  it('keeps one sample at an instant, the latest inserted', () => {
    const store = createSampleStore();
    [sample(10, 1), sample(20, 2), sample(10, 5)].forEach(store.insert);

    expect(store.range('room/temp', 'measured', 0, 30)).toHaveLength(2);
    expect(store.valueAt('room/temp', 'measured', 15)?.value).toBe(5);
  });

  it('keeps channels and paths apart', () => {
    const store = createSampleStore();
    store.insert(sample(10, 1));

    expect(store.valueAt('room/temp', 'simulated', 10)).toBeUndefined();
    expect(store.valueAt('other', 'measured', 10)).toBeUndefined();
  });

  it('returns a range with both ends included', () => {
    const store = createSampleStore();
    [10, 20, 30, 40].forEach((ts) => store.insert(sample(ts, ts)));

    const range = store.range('room/temp', 'measured', 20, 30);

    expect(range.map((s) => s.ts)).toEqual([20, 30]);
  });

  it('drops the oldest sample beyond its capacity', () => {
    const store = createSampleStore(2);
    [10, 20, 30].forEach((ts) => store.insert(sample(ts, ts)));

    expect(store.valueAt('room/temp', 'measured', 15)).toBeUndefined();
    expect(store.range('room/temp', 'measured', 0, 99)).toHaveLength(2);
  });
});
