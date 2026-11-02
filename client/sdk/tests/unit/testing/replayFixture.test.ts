import replayFixture from 'src/testing/replayFixture';
import fakeHostServices from 'src/testing/fakeHostServices';
import type { SignalSample } from 'src/index';

const sample = (
  signalPath: string,
  ts: number,
  value: number,
): SignalSample => ({
  twinId: 'j7',
  signalPath,
  channel: 'measured',
  ts,
  value,
});

const stream = [
  sample('a', 0, 1),
  sample('b', 5, 10),
  sample('a', 10, 2),
  sample('a', 20, 3),
];

describe('replayFixture', () => {
  it('samples every path at each playhead step', () => {
    const frames = replayFixture(fakeHostServices(), stream, { step: 10 });
    expect(
      frames.map((f) => [f.t, f.values.a?.value, f.values.b?.value]),
    ).toEqual([
      [0, 1, undefined],
      [10, 2, 10],
      [20, 3, 10],
    ]);
  });

  it('honours from, to, paths and channel', () => {
    const host = fakeHostServices();
    const frames = replayFixture(host, stream, {
      from: 5,
      to: 15,
      step: 5,
      paths: ['a'],
      channel: 'measured',
    });
    expect(frames).toEqual([
      { t: 5, values: { a: { value: 1, ts: 0 } } },
      { t: 10, values: { a: { value: 2, ts: 10 } } },
      { t: 15, values: { a: { value: 2, ts: 10 } } },
    ]);
  });

  it('delivers samples to subscribers as the playhead passes them', () => {
    const host = fakeHostServices();
    const seen: number[] = [];
    host.signals.subscribe(['a'], 'measured', (s) => seen.push(s.ts));
    replayFixture(host, stream, { step: 10, to: 10 });
    expect(seen).toEqual([0, 10]);
  });

  it('leaves the playhead at the last frame', () => {
    const host = fakeHostServices();
    replayFixture(host, stream, { step: 10 });
    expect(host.signals.playhead.get()).toBe(20);
  });

  it('returns no frames for an empty stream', () => {
    expect(replayFixture(fakeHostServices(), [], { step: 1 })).toEqual([]);
  });

  it.each([0, -1])('rejects step %p', (step) => {
    expect(() => replayFixture(fakeHostServices(), stream, { step })).toThrow(
      'step must be a positive number',
    );
  });
});
