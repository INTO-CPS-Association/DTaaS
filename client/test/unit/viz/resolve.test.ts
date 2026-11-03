/**
 * The exit test of the first phase in the companion report: given a recorded
 * stream and a visualisation, the core produces the right visual properties
 * at each instant of a scrub, with no substrate mounted.
 */

import type {
  SignalSample,
  VisualisationAsset,
} from '@into-cps-association/dtaas-sdk';
import createSampleStore from 'viz/sampleStore';
import resolveEncodings from 'viz/resolve';
import { colourAt, position } from 'viz/schemes';

const QUEUE = 'junction7/armA/queueLen';

const recording: SignalSample[] = [
  { twinId: 'j7', signalPath: QUEUE, channel: 'measured', ts: 1000, value: 10 },
  { twinId: 'j7', signalPath: QUEUE, channel: 'simulated', ts: 1000, value: 8 },
  { twinId: 'j7', signalPath: QUEUE, channel: 'measured', ts: 2000, value: 30 },
  {
    twinId: 'j7',
    signalPath: QUEUE,
    channel: 'simulated',
    ts: 2000,
    value: 34,
  },
];

const asset = {
  schemaVersion: '1.1',
  name: 'junction-7',
  layout: { type: 'single', panes: ['photo'] },
  substrates: { photo: { adapter: 'image', source: 'lib://j7.jpg' } },
  transports: [],
  anchors: [],
  encodings: [
    {
      target: QUEUE,
      substrate: 'photo',
      encoding: { type: 'regionFill', domain: [0, 40], scheme: 'traffic' },
    },
    {
      target: QUEUE,
      substrate: 'photo',
      encoding: { type: 'residual', against: 'simulated', domain: [-8, 8] },
    },
    { target: QUEUE, substrate: 'photo', preset: 'traffic.queue-label' },
    { target: QUEUE, substrate: 'photo', preset: 'missing.preset' },
  ],
} as unknown as VisualisationAsset;

const presets = [
  {
    id: 'traffic.queue-label',
    label: 'Queue label',
    substrate: 'image',
    encodings: [
      {
        target: 'value',
        encoding: { type: 'label', precision: 0, unit: 'cars' },
      },
    ],
  },
] as const;

describe('replaying a recorded stream through a visualisation', () => {
  const store = createSampleStore();
  recording.forEach(store.insert);
  const at = (t: number) =>
    resolveEncodings(asset, presets as never, store.valueAt, t);

  it('colours the region by the measured queue at each instant', () => {
    expect(at(1500)[0].resolved[0].properties).toEqual({
      fill: colourAt('traffic', position(10, [0, 40])),
    });
    expect(at(2500)[0].resolved[0].properties).toEqual({
      fill: colourAt('traffic', position(30, [0, 40])),
    });
  });

  it('shows measured against simulated as a residual', () => {
    expect(at(1500)[1].resolved[0].properties.residual).toBe(2);
    expect(at(2500)[1].resolved[0].properties.residual).toBe(-4);
  });

  it('applies a registered preset to the binding signal', () => {
    expect(at(2500)[2].resolved[0].properties).toEqual({ text: '30 cars' });
  });

  it('reports a preset nobody registered, and draws nothing before the first sample', () => {
    expect(at(2500)[3].problem).toBe('Unknown preset missing.preset');
    expect(at(500)[0].resolved[0].properties).toEqual({ fill: undefined });
  });
});
