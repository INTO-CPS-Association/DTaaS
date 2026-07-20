import {
  cloneElement,
  MouseEvent,
  MouseEventHandler,
  ReactElement,
  useState,
} from 'react';
import { Box, Chip, Paper, Tooltip, Typography } from '@mui/material';
import { LogEvent, LogEventType } from 'util/logger/logEvent';
import { formatTimestamp } from 'page/logViewer/logViewerUtils';
import { flattenLogContext } from 'util/logger/contextUtils';

const EVENT_CHIP_COLOR: Record<
  LogEventType,
  'primary' | 'secondary' | 'info' | 'warning' | 'default'
> = {
  click: 'primary',
  change: 'secondary',
  navigation: 'info',
  notification: 'warning',
  dismiss: 'default',
};

function OverflowTooltip({
  text,
  children,
}: Readonly<{
  text: string;
  children: ReactElement<{ onMouseEnter?: MouseEventHandler<HTMLElement> }>;
}>) {
  const [truncated, setTruncated] = useState(false);

  const measureTruncation = (event: MouseEvent<HTMLElement>) => {
    const label =
      event.currentTarget.querySelector('.MuiChip-label') ??
      event.currentTarget;
    setTruncated(label.scrollWidth > label.clientWidth);
  };

  return (
    <Tooltip title={truncated ? text : ''}>
      {cloneElement(children, { onMouseEnter: measureTruncation })}
    </Tooltip>
  );
}

function LogEntryCard({ entry }: Readonly<{ entry: LogEvent }>) {
  const contextEntries = flattenLogContext(entry.context ?? {});

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
            // Older stored events may predate the current LogEventType union.
            color={EVENT_CHIP_COLOR[entry.event] ?? 'default'}
          />
          <OverflowTooltip text={entry.label}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
              {entry.label}
            </Typography>
          </OverflowTooltip>
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
          {contextEntries.map(({ key, value }) => (
            <OverflowTooltip key={key} text={`${key}: ${value}`}>
              <Chip
                label={`${key}: ${value}`}
                size="small"
                variant="outlined"
              />
            </OverflowTooltip>
          ))}
        </Box>
      )}
    </Paper>
  );
}

export default LogEntryCard;
