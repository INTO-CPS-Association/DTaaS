import { renderHook } from '@testing-library/react';
import type { SignalSample, SignalSink } from '@into-cps-association/dtaas-sdk';
import type { LiveTransport } from 'viz/mqttTransport';
import createSampleStore from 'viz/sampleStore';
import createSignals from 'viz/signals';

function fakeTransport() {
  const sinks = new Map<string, SignalSink>();
  const off = jest.fn();
  const transport: LiveTransport = {
    id: 'fake',
    subscribe: jest.fn((paths: readonly string[], sink: SignalSink) => {
      paths.forEach((path) => sinks.set(path, sink));
      return off;
    }),
    state: () => 'live',
    onState: () => () => undefined,
    close: jest.fn(),
  };
  const emit = (sample: Partial<SignalSample>) =>
    sinks.get(sample.signalPath ?? '')?.({
      twinId: '',
      channel: 'measured',
      ts: 0,
      value: 0,
      signalPath: '',
      ...sample,
    });
  return { transport, emit, off };
}

describe('the signals service', () => {
  it('subscribes a path on the transports once and stops when nobody listens', () => {
    const { transport, off } = fakeTransport();
    const signals = createSignals([transport]);

    const first = signals.subscribe(['a'], 'measured', jest.fn());
    const second = signals.subscribe(['a'], 'simulated', jest.fn());

    expect(transport.subscribe).toHaveBeenCalledTimes(1);
    first();
    expect(off).not.toHaveBeenCalled();
    second();
    expect(off).toHaveBeenCalledTimes(1);
  });

  it('stores every sample once and tells only the subscribers of its channel', () => {
    const { transport, emit } = fakeTransport();
    const signals = createSignals([transport]);
    const measured = jest.fn();
    const simulated = jest.fn();
    signals.subscribe(['a'], 'measured', measured);
    signals.subscribe(['a'], 'simulated', simulated);

    emit({ signalPath: 'a', channel: 'simulated', ts: 10, value: 5 });

    expect(measured).not.toHaveBeenCalled();
    expect(simulated).toHaveBeenCalledTimes(1);
    expect(signals.valueAt('a', 'simulated', 10)?.value).toBe(5);
  });

  it('reads at the playhead by default, and ranges from the store', async () => {
    const store = createSampleStore();
    store.insert({
      twinId: '',
      signalPath: 'a',
      channel: 'measured',
      ts: 10,
      value: 1,
    });
    store.insert({
      twinId: '',
      signalPath: 'a',
      channel: 'measured',
      ts: 20,
      value: 2,
    });
    const signals = createSignals([], store);

    signals.playhead.set(15);

    expect(signals.valueAt('a', 'measured')?.value).toBe(1);
    const range = await signals.range(['a'], 'measured', 0, 30);
    expect(range.map((s) => s.value)).toEqual([1, 2]);
  });

  it('has no device registry yet, and says so', async () => {
    const signals = createSignals([]);

    await expect(signals.registry.search('pump')).resolves.toEqual([]);
    await expect(signals.registry.get('p1')).rejects.toThrow('not connected');
  });

  it('reports the connection of its transports', () => {
    const { transport } = fakeTransport();

    expect(createSignals([]).connection.get(['a'])).toBe('down');
    expect(createSignals([]).connection.get([])).toBe('live');
    const { result } = renderHook(() =>
      createSignals([transport]).connection.use(['a']),
    );
    expect(result.current).toBe('live');
  });
});
