import { Box, Typography } from '@mui/material';

function EmptyState({ filtered }: Readonly<{ filtered: boolean }>) {
  return (
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        color: 'text.secondary',
      }}
    >
      <Typography color="text.secondary">
        {filtered
          ? 'No entries match the current filter.'
          : 'No log entries found.'}
      </Typography>
    </Box>
  );
}

export default EmptyState;
