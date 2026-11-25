import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

interface TwinPickerProps {
  /** Unique on the page, since a tab of each kind has its own picker. */
  readonly id: string;
  readonly twins: readonly string[];
  readonly twin: string;
  readonly onChange: (twin: string) => void;
}

/** The choice of one digital twin of the user, by its folder name. */
function TwinPicker({ id, twins, twin, onChange }: TwinPickerProps) {
  const labelId = `${id}-twin`;
  return (
    <FormControl sx={{ minWidth: '16rem', mb: 2 }}>
      <InputLabel id={labelId}>Digital Twin</InputLabel>
      <Select
        labelId={labelId}
        label="Digital Twin"
        value={twin}
        onChange={(event) => onChange(event.target.value)}
      >
        {twins.map((name) => (
          <MenuItem key={name} value={name}>
            {name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default TwinPicker;
