import type { SignalSample } from '@into-cps-association/dtaas-sdk';
import eventHandler, { type StreamTarget } from 'viz/gatewayEvents';
import { clearDeliveryTimings, deliveryTimings } from 'viz/deliveryTimings';

function targetCollecting(samples: SignalSample[]): StreamTarget {
  const sinks = new Set([(sample: SignalSample) => samples.push(sample)]);
  return {
    sinksOf: () => sinks,
    setState: jest.fn(),
    refuse: jest.fn(),
    channel: 'measured',
  };
}

const sampleEvent = (data: Record<string, unknown>) => ({
  event: 'sample',
  data: JSON.stringify(data),
});

describe('the events of a gateway stream', () => {
  beforeEach(() => clearDeliveryTimings());
  afterEach(() => jest.useRealTimers());

  it('names the twin the gateway sends with a sample', () => {
    const samples: SignalSample[] = [];
    eventHandler(targetCollecting(samples))(
      sampleEvent({
        path: 'alice/pump/flow',
        twin: 'pump',
        channel: 'measured',
        receivedAt: 1000,
        payload: '{"value": 3, "ts": 900}',
      }),
    );

    expect(samples).toEqual([
      expect.objectContaining({ twinId: 'pump', ts: 900, value: 3 }),
    ]);
  });

  it('reads a payload of the naming convention, with value, ts and unit', () => {
    const samples: SignalSample[] = [];
    eventHandler(targetCollecting(samples))(
      sampleEvent({
        path: 'alice/pump/flow',
        payload: JSON.stringify({
          value: 21.4,
          ts: '2026-11-06T10:00:00Z',
          unit: 'Cel',
        }),
      }),
    );

    expect(samples).toEqual([
      expect.objectContaining({
        signalPath: 'alice/pump/flow',
        channel: 'measured',
        ts: Date.parse('2026-11-06T10:00:00Z'),
        value: 21.4,
      }),
    ]);
  });

  it('keeps when each sample was measured, received and read', () => {
    jest.useFakeTimers({ now: 1500 });
    eventHandler(targetCollecting([]))(
      sampleEvent({
        path: 'alice/pump/flow',
        receivedAt: 1000,
        payload: '{"value": 3, "ts": 900}',
      }),
    );
    eventHandler(targetCollecting([]))(
      sampleEvent({ path: 'alice/pump/flow', payload: 'unreadable' }),
    );

    expect(deliveryTimings()).toEqual([
      { path: 'alice/pump/flow', ts: 900, receivedAt: 1000, arrivedAt: 1500 },
    ]);
  });

  it('hands on a past reading from the history but leaves it out of the timings', () => {
    const samples: SignalSample[] = [];
    eventHandler(targetCollecting(samples))(
      sampleEvent({
        path: 'alice/pump/flow',
        receivedAt: 900,
        backfill: true,
        payload: '{"value":3,"ts":"1970-01-01T00:00:00.900Z"}',
      }),
    );

    expect(samples).toEqual([expect.objectContaining({ ts: 900, value: 3 })]);
    expect(deliveryTimings()).toEqual([]);
  });
});
