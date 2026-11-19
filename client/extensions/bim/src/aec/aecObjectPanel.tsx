/**
 * The facts of the object picked on the `aec` canvas, as the Buildings page
 * shows them: a table from the property tree and the geometry, the sensor on
 * it, and its property sets behind a button. React escapes every value.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import type { ObjectFacts } from './aecTree';

export interface Size {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PickedObject {
  readonly globalId: string;
  readonly facts?: ObjectFacts;
  readonly size?: Size;
  /** The sensor anchored on it, by name and signal path. */
  readonly sensor?: { readonly name: string; readonly signal: string };
}

/** A size in metres, the unit of glTF, or in millimetres below half a metre. */
export function sizeText({ x, y, z }: Size): string {
  const parts = [x, y, z];
  if (Math.max(...parts) < 0.5) {
    return `${parts.map((n) => Math.round(n * 1000)).join(' × ')} mm`;
  }
  return `${parts.map((n) => n.toFixed(2)).join(' × ')} m`;
}

/** A row of the table, left out when there is nothing to say. */
function Row({
  name,
  value,
}: {
  readonly name: string;
  readonly value: unknown;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <TableRow>
      <TableCell
        sx={{ width: 160, color: 'text.secondary', border: 0, py: 0.3 }}
      >
        {name}
      </TableCell>
      <TableCell sx={{ border: 0, py: 0.3, wordBreak: 'break-word' }}>
        {String(value)}
      </TableCell>
    </TableRow>
  );
}

function FactsTable({ picked }: { readonly picked: PickedObject }) {
  const { facts, size, sensor } = picked;
  // IFC writes NOTDEFINED when the exporter said nothing, which is no type.
  const type = facts?.predefinedType;
  return (
    <Table size="small">
      <TableBody>
        <Row name="Name" value={facts?.name} />
        <Row name="IFC Class" value={facts?.ifcClass} />
        <Row name="Predefined Type" value={type === 'NOTDEFINED' ? '' : type} />
        <Row name="Storey" value={facts?.storey} />
        <Row name="Room" value={facts?.room} />
        <Row name="Hosted In" value={facts?.host} />
        <Row name="Size" value={size && sizeText(size)} />
        <Row name="Global ID" value={picked.globalId} />
        <Row name="Sensor" value={sensor?.name} />
        <Row name="Signal" value={sensor?.signal} />
      </TableBody>
    </Table>
  );
}

function PropertySet(props: {
  readonly name: string;
  readonly values: Record<string, unknown>;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Box sx={{ mb: 0.5 }}>
        <Chip size="small" label={props.name} />
      </Box>
      <Table size="small">
        <TableBody>
          {Object.entries(props.values).map(([key, value]) => (
            <Row key={key} name={key} value={value} />
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

function CloseButton({ onClose }: { readonly onClose: () => void }) {
  return (
    <IconButton
      aria-label="Close"
      onClick={onClose}
      sx={{ position: 'absolute', right: 8, top: 8 }}
    >
      <CloseIcon />
    </IconButton>
  );
}

function PropertySets({ picked }: { readonly picked: PickedObject }) {
  return (
    <Stack spacing={1}>
      {Object.entries(picked.facts?.properties ?? {}).map(([name, values]) => (
        <PropertySet key={name} name={name} values={values} />
      ))}
    </Stack>
  );
}

interface PropertiesDialogProps {
  readonly picked: PickedObject;
  readonly open: boolean;
  readonly onClose: () => void;
}

function PropertiesDialog(props: PropertiesDialogProps) {
  const { facts } = props.picked;
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogTitle sx={{ pr: 6 }}>
        {facts?.name ?? facts?.ifcClass ?? 'Properties'}
        <CloseButton onClose={props.onClose} />
      </DialogTitle>
      <DialogContent dividers>
        <PropertySets picked={props.picked} />
      </DialogContent>
    </Dialog>
  );
}

/** The button that opens the property sets, when the tree has any. */
function PropertiesButton({ picked }: { readonly picked: PickedObject }) {
  const [open, setOpen] = useState(false);
  if (Object.keys(picked.facts?.properties ?? {}).length === 0) return null;
  return (
    <Box>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
        Properties
      </Button>
      <PropertiesDialog
        picked={picked}
        open={open}
        onClose={() => setOpen(false)}
      />
    </Box>
  );
}

export default function ObjectPanel({
  picked,
}: {
  readonly picked: PickedObject | null;
}) {
  if (!picked) {
    return (
      <Typography variant="body2" color="text.secondary">
        Click an object to see what it is.
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <FactsTable picked={picked} />
      </Paper>
      <PropertiesButton picked={picked} />
    </Stack>
  );
}
