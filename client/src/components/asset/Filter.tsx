import { TextField, Box, IconButton, InputAdornment } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import type { LogContext } from 'util/logger/logEvent';

interface FilterProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  loggerLabel?: string;
  loggerContext?: LogContext;
  captureValue?: boolean;
  disableLogging?: boolean;
  sx?: SxProps<Theme>;
}

const filterDefaults: Required<
  Pick<
    FilterProps,
    | 'placeholder'
    | 'loggerLabel'
    | 'loggerContext'
    | 'captureValue'
    | 'disableLogging'
  >
> = {
  placeholder: 'Search by name',
  loggerLabel: 'Asset filter',
  loggerContext: {},
  captureValue: false,
  disableLogging: false,
} satisfies Partial<FilterProps>;

type FilterContentProps = Omit<
  FilterProps,
  | 'placeholder'
  | 'loggerLabel'
  | 'loggerContext'
  | 'captureValue'
  | 'disableLogging'
> &
  typeof filterDefaults;

function inputLoggerProps(
  disableLogging: boolean,
  loggerLabel: string,
  captureValue: boolean,
  context: string,
) {
  return disableLogging
    ? {}
    : {
        'data-logger-element': 'input',
        'data-logger-label': loggerLabel,
        'data-logger-context': context,
        'data-logger-capture-value': captureValue ? 'true' : 'false',
      };
}

function clearButtonLoggerProps(disableLogging: boolean, context: string) {
  return disableLogging
    ? {}
    : {
        'data-logger-element': 'button',
        'data-logger-label': 'Clear search',
        'data-logger-context': context,
      };
}

function sxValues(sx?: SxProps<Theme>) {
  return Array.isArray(sx) ? sx : [sx];
}

function defaultValue<T>(value: T | undefined, fallback: T): T {
  return value ?? fallback;
}

function FilterContent({
  placeholder,
  value,
  onChange,
  loggerLabel,
  loggerContext,
  captureValue,
  disableLogging,
  sx,
}: FilterContentProps) {
  const handleClear = () => onChange('');
  const context = JSON.stringify(loggerContext);

  return (
    <Box
      sx={[
        { marginTop: 2, display: 'flex', alignItems: 'center', gap: 1 },
        ...sxValues(sx),
      ]}
    >
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        sx={{ maxWidth: 300 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
          htmlInput: inputLoggerProps(
            disableLogging,
            loggerLabel,
            captureValue,
            context,
          ),
        }}
      />
      {value && (
        <IconButton
          onClick={handleClear}
          aria-label="Clear search"
          {...clearButtonLoggerProps(disableLogging, context)}
        >
          <ClearIcon />
        </IconButton>
      )}
    </Box>
  );
}

const Filter: React.FC<FilterProps> = (props) => (
  <FilterContent
    {...props}
    placeholder={defaultValue(props.placeholder, filterDefaults.placeholder)}
    loggerLabel={defaultValue(props.loggerLabel, filterDefaults.loggerLabel)}
    loggerContext={defaultValue(
      props.loggerContext,
      filterDefaults.loggerContext,
    )}
    captureValue={defaultValue(props.captureValue, filterDefaults.captureValue)}
    disableLogging={defaultValue(
      props.disableLogging,
      filterDefaults.disableLogging,
    )}
  />
);

export default Filter;
