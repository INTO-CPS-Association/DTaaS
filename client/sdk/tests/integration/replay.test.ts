import {
  fakeHostServices,
  replayFixture,
} from '@into-cps-association/dtaas-sdk/testing';
import type { SignalSample } from '@into-cps-association/dtaas-sdk';
import stream from 'tests/fixtures/stream.json';

const samples = stream as SignalSample[];

describe('fixture replay of a recorded stream', () => {
  it('reads measured values at every playhead position', () => {
    const frames = replayFixture(fakeHostServices(), samples, { step: 1000 });
    expect(
      frames.map(({ t, values }) => [
        t,
        values['hello/room1/temperature']?.value,
        values['hello/room2/temperature']?.value,
      ]),
    ).toEqual([
      [1000, 20.5, undefined],
      [2000, 22.25, 18],
      [3000, 22.25, 19.5],
    ]);
  });

  it('keeps measured and simulated channels separately addressable (R5)', () => {
    const host = fakeHostServices();
    const simulated = replayFixture(host, samples, {
      step: 500,
      from: 2000,
      to: 2500,
      paths: ['hello/room1/temperature'],
      channel: 'simulated',
    });
    expect(
      simulated.map((f) => f.values['hello/room1/temperature']?.value),
    ).toEqual([21, 22]);
    expect(
      host.signals.valueAt('hello/room1/temperature', 'measured', 2500)?.value,
    ).toBe(22.25);
  });

  it('carries sample quality through to the reading', () => {
    const [last] = replayFixture(fakeHostServices(), samples, {
      step: 1000,
      from: 3000,
    });
    expect(last.values['hello/room2/temperature']).toEqual({
      value: 19.5,
      ts: 3000,
      quality: 'stale',
    });
  });
});
