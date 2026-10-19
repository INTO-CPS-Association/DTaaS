/**
 * A twin drawn from its `visualisation.json`: one pane per substrate of its
 * layout, coloured by the encodings at the playhead. Every pane reads the
 * same clock, so a photograph and an embedded dashboard always show the same
 * instant.
 */

import { useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import type {
  SignalsService,
  VisualisationAsset,
  VizService,
} from '@into-cps-association/dtaas-sdk';
import resolveEncodings from 'viz/resolve';
import usePanes, { type MountedPane } from 'viz/components/usePanes';
import useSamples from 'viz/components/useSamples';

interface TwinViewerProps {
  readonly asset: VisualisationAsset;
  readonly signals: SignalsService;
  readonly viz: VizService;
}

/** Apply every resolved encoding at `t` to the element it targets. */
function draw(
  { asset, signals, viz }: TwinViewerProps,
  panes: ReadonlyMap<string, MountedPane>,
  t: number,
) {
  resolveEncodings(asset, viz.presets, signals.valueAt, t).forEach(
    (binding) => {
      const pane = panes.get(binding.substrate);
      const ref = pane?.refs.get(binding.target);
      if (pane && ref)
        binding.resolved.forEach((e) => pane.adapter.apply(ref, e));
    },
  );
  panes.forEach((pane) => pane.adapter.setTime(t));
}

/** One pane per row on a phone, up to two side by side on a wider screen. */
const gridOf = (panes: number) => ({
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { md: `repeat(${Math.min(panes, 2)}, 1fr)` },
});

function TwinViewer(props: TwinViewerProps) {
  const { asset, signals, viz } = props;
  const { register, panes, problems } = usePanes(asset, viz);
  const version = useSamples(asset, signals);
  const t = signals.playhead.use();
  useEffect(
    () => draw({ asset, signals, viz }, panes, t),
    [asset, signals, viz, panes, t, version],
  );
  return (
    <Box sx={gridOf(asset.layout.panes.length)}>
      {asset.layout.panes.map((pane) => (
        <Box key={pane} component="section" aria-label={pane}>
          {problems.has(pane) && (
            <Alert severity="error">{problems.get(pane)}</Alert>
          )}
          <div ref={register(pane)} />
        </Box>
      ))}
    </Box>
  );
}

export default TwinViewer;
