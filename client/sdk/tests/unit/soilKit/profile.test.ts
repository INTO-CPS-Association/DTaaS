import type { Anchor } from '@into-cps-association/dtaas-sdk';
import {
  binMeans,
  heatmapGrid,
  profilesOf,
  sensorOf,
} from 'examples/soil-kit/src/core';

const path = (profile: string, device: string, quantity = 'soil_moisture') =>
  `AUSoil/Site1/field/07/${profile}/S/${device}/${quantity}`;

const anchor = (signalPath: string, ref: string): Anchor => ({
  signalPath,
  kind: 'soil-depth',
  ref,
});

describe('sensorOf', () => {
  it('joins the topic and the depth range of an anchor', () => {
    expect(sensorOf(anchor(path('P03', 'D1'), 'P03/0.20-0.40'))).toEqual({
      profile: 'P03',
      from: 0.2,
      to: 0.4,
      signalPath: path('P03', 'D1'),
      deviceId: 'D1',
      quantity: 'soil_moisture',
    });
  });

  it('leaves out other kinds, bad references and another profile', () => {
    const good = anchor(path('P03', 'D1'), 'P03/0.20-0.40');
    expect(sensorOf({ ...good, kind: 'ifc-guid' })).toBeUndefined();
    expect(sensorOf({ ...good, ref: 'P03/0.40-0.20' })).toBeUndefined();
    expect(sensorOf({ ...good, ref: 'P04/0.20-0.40' })).toBeUndefined();
    expect(sensorOf({ ...good, signalPath: 'room/1/t' })).toBeUndefined();
  });
});

describe('profilesOf', () => {
  it('groups sensors by profile, each read downwards', () => {
    const profiles = profilesOf([
      anchor(path('P04', 'D9'), 'P04/0.00-0.20'),
      anchor(path('P03', 'D2'), 'P03/0.20-0.40'),
      anchor(path('P03', 'D1', 'soil_temperature'), 'P03/0.00-0.20'),
      anchor(path('P03', 'D1'), 'P03/0.00-0.20'),
      anchor(path('P03', 'D1'), 'bad'),
    ]);
    expect([...profiles.keys()]).toEqual(['P03', 'P04']);
    expect(profiles.get('P03')?.map((s) => `${s.from} ${s.quantity}`)).toEqual([
      '0 soil_moisture',
      '0 soil_temperature',
      '0.2 soil_moisture',
    ]);
  });
});

describe('the heatmap grid', () => {
  const window = { from: 0, to: 100, bins: 4 };

  it('takes the mean of each stretch and leaves empty ones empty', () => {
    const samples = [
      { signalPath: 'a', ts: 0, value: 1 },
      { signalPath: 'a', ts: 10, value: 3 },
      { signalPath: 'a', ts: 100, value: 8 },
      { signalPath: 'a', ts: 101, value: 99 },
      { signalPath: 'a', ts: 60, value: 'wet' },
    ];
    expect(binMeans(samples, window)).toEqual([2, undefined, undefined, 8]);
  });

  it('gives one row per path, in the order asked', () => {
    const samples = [
      { signalPath: 'b', ts: 30, value: 5 },
      { signalPath: 'a', ts: 80, value: 7 },
    ];
    expect(heatmapGrid(samples, ['b', 'a'], window)).toEqual([
      [undefined, 5, undefined, undefined],
      [undefined, undefined, undefined, 7],
    ]);
  });

  it('is empty for an empty window', () => {
    const samples = [{ signalPath: 'a', ts: 0, value: 1 }];
    expect(binMeans(samples, { from: 5, to: 5, bins: 2 })).toEqual([
      undefined,
      undefined,
    ]);
  });
});
