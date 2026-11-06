/**
 * The legends under the `aec` canvas, as on the Buildings page: what the
 * marker colours mean, and what the colours of the model mean, where a row
 * lights every object of its class. Also the dialog listing the keys.
 */

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemButton from '@mui/material/ListItemButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { colourAt } from '@into-cps-association/dtaas-sdk';
import type { ClassEntry } from './aecAppearance';
import type { MarkerColours, Quantity } from './aecColours';
import { OPTIONS } from './aecShortcuts';

function Swatch({ colour }: { readonly colour: string }) {
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: 0.5,
        bgcolor: colour,
        border: 1,
        borderColor: 'divider',
        flexShrink: 0,
      }}
    />
  );
}

function Caption({ text }: { readonly text: string }) {
  return (
    <Typography variant="caption" color="text.secondary">
      {text}
    </Typography>
  );
}

/** The gradient of a colour scheme, low to high. */
function barOf(scheme: string) {
  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => colourAt(scheme, t));
  const background = `linear-gradient(to right, ${stops.join(', ')})`;
  return { mt: 0.5, height: 10, borderRadius: 0.5, background };
}

/** One colour scale: its bar, its two ends and how many sensors use it. */
function ScaleLegend(props: {
  readonly quantity: Quantity;
  readonly sensors: number;
}) {
  const { scheme = '', domain = [] } = props.quantity;
  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Caption text="Heatmap" />
      <Box sx={barOf(scheme)} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.3 }}>
        <Typography variant="body2">{domain[0]}</Typography>
        <Typography variant="body2">{domain[1]}</Typography>
      </Box>
      <Chip
        size="small"
        sx={{ mt: 0.5 }}
        label={`${props.sensors} sensors, ${props.quantity.key}`}
      />
    </Paper>
  );
}

/** The scales colouring the markers now, or a note when none has a value. */
export function HeatLegend({ colours }: { readonly colours: MarkerColours }) {
  if (colours.mode === 'off') return null;
  const scales = colours.shown().filter((q) => q.scheme && q.domain);
  if (scales.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 1 }}>
        <Caption text="Heatmap" />
        <Typography variant="body2">
          No current reading to colour by.
        </Typography>
      </Paper>
    );
  }
  return scales.map((q) => (
    <ScaleLegend key={q.key} quantity={q} sensors={colours.countOf(q)} />
  ));
}

interface ClassLegendProps {
  readonly classes: readonly ClassEntry[];
  readonly highlighted: string | null;
  readonly onPick: (ifcClass: string) => void;
}

interface ClassRowProps {
  readonly entry: ClassEntry;
  readonly selected: boolean;
  readonly onPick: (ifcClass: string) => void;
}

const COUNT = { ml: 'auto', pl: 1.5, fontVariantNumeric: 'tabular-nums' };

function ClassRow({ entry, selected, onPick }: ClassRowProps) {
  return (
    <ListItemButton
      dense
      selected={selected}
      onClick={() => onPick(entry.ifcClass)}
      // Thirty two pixels keeps each row above the 24 pixel target of WCAG
      // 2.2 AA while a long list of classes still fits.
      sx={{ gap: 0.75, py: 0.2, minHeight: 32, borderRadius: 1 }}
    >
      <Swatch colour={entry.colour} />
      <Typography variant="body2">
        {entry.ifcClass.replace(/^Ifc/, '')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={COUNT}>
        {entry.count}
      </Typography>
    </ListItemButton>
  );
}

/** What the colours of the model mean; a row lights its class. */
export function ClassLegend({
  classes,
  highlighted,
  onPick,
}: ClassLegendProps) {
  if (classes.length === 0) return null;
  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Caption text="In This Model" />
      <Stack sx={{ mt: 0.5, gap: 0.25 }}>
        {classes.map((entry) => (
          <ClassRow
            key={entry.ifcClass}
            entry={entry}
            selected={entry.ifcClass === highlighted}
            onPick={onPick}
          />
        ))}
      </Stack>
    </Paper>
  );
}

/** The keys, written from the same table that binds them. */
export function HelpPanel(props: {
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Shortcuts</DialogTitle>
      <DialogContent>
        <Table size="small">
          <TableBody>
            {OPTIONS.map((option) => (
              <TableRow key={option.key}>
                <TableCell sx={{ width: 48 }}>
                  <code>{option.key}</code>
                </TableCell>
                <TableCell>{option.label}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
