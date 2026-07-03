import { Box, Chip, Paper, Typography } from '@mui/material';
import { LogEvent, LogEventType } from 'util/logger/logEvent';
import { formatTimestamp } from 'page/logViewer/logViewerUtils';

const EVENT_CHIP_COLOR: Record<
  LogEventType,
  'primary' | 'secondary' | 'info' | 'warning'
> = {
  click: 'primary',
  change: 'secondary',
  navigation: 'info',
  notification: 'warning',
};

function LogEntryCard({ entry }: Readonly<{ entry: LogEvent }>) {
  const contextEntries = Object.entries(entry.context ?? {});

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        transition: 'border-color 0.15s ease',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          mb: 0.5,
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
        >
          <Chip
            label={entry.event}
            size="small"
            color={EVENT_CHIP_COLOR[entry.event]}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
            {entry.label}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          title={entry.timestamp}
          sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatTimestamp(entry.timestamp)}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        <Box component="span" sx={{ fontWeight: 600 }}>
          {entry.element}
        </Box>
        {' · '}
        {entry.page}
      </Typography>
      {contextEntries.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {contextEntries.map(([key, value]) => (
            <Chip
              key={key}
              label={`${key}: ${value}`}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}

export default LogEntryCard;
