/**
 * The row above the `aec` canvas, as on the Buildings page: one outlined
 * icon button per option, each printing its key, then the floor picker. A
 * toggle that is on is drawn selected; an action never lights up.
 */

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import Tooltip from '@mui/material/Tooltip';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import iconFor from './aecIcons';
import { OPTIONS, type Option, type OptionContext } from './aecShortcuts';

interface OptionButtonProps {
  readonly option: Option;
  readonly context: OptionContext;
}

function OptionButton({ option, context }: OptionButtonProps) {
  const on = option.on?.(context) ?? false;
  const badge = option.badge?.(context);
  return (
    <Tooltip title={`${option.label}  (${option.key})`}>
      <ToggleButton
        value={option.key}
        selected={on}
        size="small"
        onChange={() => option.run(context)}
        aria-label={option.label}
        sx={{ gap: 0.5, textTransform: 'none' }}
      >
        {iconFor(option.icon)}
        <Box component="span" sx={{ fontSize: 11, opacity: 0.7 }}>
          {option.key}
        </Box>
        {on && badge && <Chip size="small" label={badge} sx={{ height: 18 }} />}
      </ToggleButton>
    </Tooltip>
  );
}

export function Toolbar({ context }: { readonly context: OptionContext }) {
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
      {OPTIONS.map((option) => (
        <OptionButton key={option.key} option={option} context={context} />
      ))}
    </Stack>
  );
}

/** The select's value for every floor, since a select cannot hold null. */
const ALL = '';

interface FloorPickerProps {
  /** The floors, lowest first. */
  readonly storeys: readonly string[];
  /** The floor shown, or null for all of them. */
  readonly current: string | null;
  readonly onChange: (storey: string | null) => void;
}

// With `displayEmpty` the select shows All Floors, and the label has to stay
// shrunk or it is drawn over that text.
const SELECT_SLOTS = {
  select: {
    displayEmpty: true,
    renderValue: (v: unknown) => (v === ALL ? 'All Floors' : String(v)),
  },
  inputLabel: { shrink: true },
};

function FloorSelect({ storeys, current, onChange }: FloorPickerProps) {
  return (
    <TextField
      select
      size="small"
      label="Floor"
      value={current ?? ALL}
      onChange={(e) => onChange(e.target.value === ALL ? null : e.target.value)}
      slotProps={SELECT_SLOTS}
      sx={{ minWidth: 180 }}
    >
      <MenuItem value={ALL}>All Floors</MenuItem>
      {storeys.map((storey) => (
        <MenuItem key={storey} value={storey}>
          {storey}
        </MenuItem>
      ))}
    </TextField>
  );
}

function Step(props: {
  readonly up: boolean;
  readonly disabled: boolean;
  readonly onClick: () => void;
}) {
  const title = props.up ? 'The floor above' : 'The floor below';
  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          size="small"
          aria-label={title}
          disabled={props.disabled}
          onClick={props.onClick}
        >
          {props.up ? (
            <KeyboardArrowUpIcon fontSize="small" />
          ) : (
            <KeyboardArrowDownIcon fontSize="small" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

/** The floor after `at` going `by`; from all floors, up starts at the
 * lowest and down at the highest. Null when there is none. */
export function stepFloor(at: number, by: number, count: number) {
  let next = at + by;
  if (at === -1) next = by > 0 ? 0 : count - 1;
  return next >= 0 && next < count ? next : null;
}

/** The floor select with its arrows, for a model with several floors. */
export function FloorPicker(props: FloorPickerProps) {
  const { storeys, current, onChange } = props;
  if (storeys.length < 2) return null;
  const at = current === null ? -1 : storeys.indexOf(current);
  const step = (by: number) => {
    const next = stepFloor(at, by, storeys.length);
    if (next !== null) onChange(storeys[next]);
  };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
      <FloorSelect {...props} />
      <Step up disabled={at === storeys.length - 1} onClick={() => step(1)} />
      <Step up={false} disabled={at === 0} onClick={() => step(-1)} />
    </Box>
  );
}
