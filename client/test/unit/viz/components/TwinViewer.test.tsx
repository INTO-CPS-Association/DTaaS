import { act, render, screen } from '@testing-library/react';
import type {
  SubstrateAdapter,
  VisualisationAsset,
} from '@into-cps-association/dtaas-sdk';
import {
  createFakeSignals,
  createFakeViz,
} from '@into-cps-association/dtaas-sdk/testing';
import TwinViewer from 'viz/components/TwinViewer';
import createSignals from 'viz/signals';

const asset = {
  schemaVersion: '1.0',
  name: 'junction-7',
  layout: { type: 'single', panes: ['photo'] },
  substrates: { photo: { adapter: 'stub', source: 'j7.jpg' } },
  anchors: [{ signalPath: 'j7/queue', kind: 'image-point', ref: '1,2' }],
  encodings: [
    {
      target: 'j7/queue',
      substrate: 'photo',
      encoding: { type: 'label', unit: 'cars', precision: 0 },
    },
  ],
} as unknown as VisualisationAsset;

function stubAdapter() {
  const adapter = {
    id: 'stub',
    supports: ['image-point'],
    mount: jest.fn(async (container: HTMLElement) => {
      container.append(document.createElement('canvas'));
    }),
    resolve: jest.fn((anchor) => ({
      substrate: 'stub',
      id: anchor.signalPath,
    })),
    apply: jest.fn(),
    frame: jest.fn(),
    pick: () => null,
    setTime: jest.fn(),
    dispose: jest.fn(),
  };
  return adapter as typeof adapter & SubstrateAdapter;
}

describe('the twin viewer', () => {
  it('mounts each pane and draws the reading at the playhead', async () => {
    const adapter = stubAdapter();
    const viz = createFakeViz({ substrates: { stub: adapter } });
    const signals = createFakeSignals({ now: () => 2000 });

    const { unmount } = render(
      <TwinViewer asset={asset} signals={signals} viz={viz} />,
    );
    await act(async () => {
      signals.emit({
        twinId: 'junction7',
        signalPath: 'j7/queue',
        channel: 'measured',
        ts: 1000,
        value: 12,
      });
    });

    expect(
      screen.getByRole('region', { name: 'photo' }).querySelector('canvas'),
    ).not.toBeNull();
    expect(adapter.apply).toHaveBeenCalledWith(
      { substrate: 'stub', id: 'j7/queue' },
      expect.objectContaining({ properties: { text: '12 cars' } }),
    );
    expect(adapter.setTime).toHaveBeenCalled();
    unmount();
    expect(adapter.dispose).toHaveBeenCalled();
  });

  it('says which pane could not be drawn', async () => {
    const viz = createFakeViz({ substrates: {} });

    await act(async () => {
      render(
        <TwinViewer asset={asset} signals={createFakeSignals()} viz={viz} />,
      );
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('stub');
  });

  it('disposes of a pane that finishes mounting after the twin was left', async () => {
    const adapter = stubAdapter();
    let finish: () => void = () => undefined;
    adapter.mount.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const viz = createFakeViz({ substrates: { stub: adapter } });
    const { unmount } = render(
      <TwinViewer asset={asset} signals={createFakeSignals()} viz={viz} />,
    );
    await act(async () => undefined);

    unmount();
    await act(async () => finish());

    expect(adapter.dispose).toHaveBeenCalledTimes(1);
    expect(adapter.apply).not.toHaveBeenCalled();
  });

  it('shows the stored value when the timeline is scrubbed to before the page opened', async () => {
    const adapter = stubAdapter();
    const viz = createFakeViz({ substrates: { stub: adapter } });
    const opened = 10 * 3_600_000;
    const history = {
      range: jest.fn(async () => ({
        samples: [
          {
            twinId: '',
            signalPath: 'j7/queue',
            channel: 'measured' as const,
            ts: opened - 600_000,
            value: 7,
          },
        ],
        truncated: false,
      })),
    };
    const signals = createSignals([], undefined, history, () => opened);

    render(<TwinViewer asset={asset} signals={signals} viz={viz} />);
    await act(async () => undefined);
    adapter.apply.mockClear();
    await act(async () => signals.playhead.set(opened - 300_000));

    expect(history.range).toHaveBeenCalledWith(
      ['j7/queue'],
      'measured',
      expect.any(Number),
      opened,
    );
    expect(adapter.apply).toHaveBeenCalledWith(
      { substrate: 'stub', id: 'j7/queue' },
      expect.objectContaining({ properties: { text: '7 cars' } }),
    );
  });
});
