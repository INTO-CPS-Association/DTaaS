import { act, render } from '@testing-library/react';
import type {
  SubstrateAdapter,
  VisualisationAsset,
} from '@into-cps-association/dtaas-sdk';
import { createFakeViz } from '@into-cps-association/dtaas-sdk/testing';
import TwinViewer from 'viz/components/TwinViewer';
import createGatewayHistory from 'viz/gatewayHistory';
import createSignals from 'viz/signals';

// The Visualise tab's viewer, the signals core and the gateway history read
// together, with a fake gateway answering POST /signals/range.
const HOUR = 3_600_000;
const opened = 100 * HOUR;

const asset = {
  schemaVersion: '1.0',
  name: 'room',
  layout: { type: 'single', panes: ['photo'] },
  substrates: { photo: { adapter: 'stub', source: 'room.jpg' } },
  anchors: [{ signalPath: 'site/room/t', kind: 'image-point', ref: '1,2' }],
  encodings: [
    {
      target: 'site/room/t',
      substrate: 'photo',
      encoding: { type: 'label', unit: 'Cel', precision: 1 },
    },
  ],
} as unknown as VisualisationAsset;

function stubAdapter() {
  return {
    id: 'stub',
    supports: ['image-point'],
    mount: jest.fn(async () => undefined),
    resolve: jest.fn((anchor) => ({
      substrate: 'stub',
      id: anchor.signalPath,
    })),
    apply: jest.fn(),
    frame: jest.fn(),
    pick: () => null,
    setTime: jest.fn(),
    dispose: jest.fn(),
  } as unknown as SubstrateAdapter & { apply: jest.Mock };
}

function fakeGateway() {
  return jest.fn(async (_url: string, init?: RequestInit) => {
    const { paths, from } = JSON.parse(String(init?.body));
    const samples = paths.map((path: string) => ({
      path,
      channel: 'measured',
      ts: from + HOUR / 2,
      value: 21.5,
      quality: 'good',
    }));
    return {
      ok: true,
      status: 200,
      json: async () => ({ samples, truncated: false }),
    } as Response;
  });
}

describe('past readings on the Visualise tab', () => {
  it('reads the hour before the page opened once and shows it when scrubbed back', async () => {
    const fetch = fakeGateway();
    const history = createGatewayHistory({
      url: 'https://dtaas.example/signals',
      token: () => 'token',
      fetch,
    });
    const signals = createSignals([], undefined, history, () => opened);
    const adapter = stubAdapter();
    const viz = createFakeViz({ substrates: { stub: adapter } });

    render(<TwinViewer asset={asset} signals={signals} viz={viz} />);
    await act(async () => undefined);
    // On open: the hour before the page opened, up to the live buffer.
    expect(fetch).toHaveBeenCalledTimes(1);
    const first = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(fetch.mock.calls[0][0]).toBe('https://dtaas.example/signals/range');
    expect(first).toEqual({
      paths: ['site/room/t'],
      channel: 'measured',
      from: opened - HOUR,
      to: opened,
    });

    // A scrub reads only the quarter hour its window adds, and a scrub
    // inside what is held reads nothing.
    await act(async () => signals.playhead.set(opened - HOUR / 4));
    await act(async () => signals.playhead.set(opened - HOUR / 8));
    expect(fetch).toHaveBeenCalledTimes(2);
    const second = JSON.parse(String(fetch.mock.calls[1][1]?.body));
    expect(second.to - second.from).toBe(HOUR / 4);

    expect(adapter.apply).toHaveBeenLastCalledWith(
      { substrate: 'stub', id: 'site/room/t' },
      expect.objectContaining({ properties: { text: '21.5 Cel' } }),
    );
  });
});
