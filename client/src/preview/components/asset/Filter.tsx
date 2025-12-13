import { TextField, Box, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface FilterProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

const Filter: React.FC<FilterProps> = ({
  placeholder = 'Search by name',
  value,
  onChange,
}) => {
  const handleClear = () => onChange('');

  return (
    <Box sx={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
      <SearchIcon />
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        sx={{ maxWidth: 300 }}
      />
      {value && (
        <IconButton onClick={handleClear} aria-label="Clear search">
          <ClearIcon />
        </IconButton>
      )}
    </Box>
  );
};

export default Filter;
