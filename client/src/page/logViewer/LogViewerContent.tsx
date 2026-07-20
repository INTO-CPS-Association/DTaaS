import { ReactNode, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import LogEntryCard from 'page/logViewer/LogEntryCard';
import RawLogView from 'page/logViewer/RawLogView';
import EmptyState from 'page/logViewer/EmptyState';
import { LogEvent } from 'util/logger/logEvent';
import {
  MAX_RENDERED_LOG_ENTRIES,
  getRenderCapNote,
} from 'page/logViewer/logViewerUtils';
import useAvailableHeight from 'util/useAvailableHeight';

interface LogViewerContentProps {
  loading: boolean;
  entries: LogEvent[];
  rawView: boolean;
  filtered: boolean;
}

const LOG_CONTENT_MIN_HEIGHT_PX = 320;

function renderEntries(
  entries: LogEvent[],
  rawView: boolean,
  filtered: boolean,
): ReactNode {
  if (entries.length === 0) return <EmptyState filtered={filtered} />;
  if (rawView) return <RawLogView entries={entries} />;
  const capNote = getRenderCapNote(entries.length);
  return (
    <>
      {entries.slice(0, MAX_RENDERED_LOG_ENTRIES).map((entry, index) => (
        <LogEntryCard
          key={entry.id ?? `${entry.timestamp}-${index}`}
          entry={entry}
        />
      ))}
      {capNote && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {capNote}
        </Typography>
      )}
    </>
  );
}

function LogViewerContent({
  loading,
  entries,
  rawView,
  filtered,
}: Readonly<LogViewerContentProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentHeight = useAvailableHeight(containerRef, {
    minHeight: LOG_CONTENT_MIN_HEIGHT_PX,
    deps: [loading],
  });

  if (loading) {
    return (
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          maxHeight: contentHeight,
          minHeight: LOG_CONTENT_MIN_HEIGHT_PX,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      data-testid="log-content"
      sx={{
        backgroundColor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
        p: 2,
        borderRadius: 1,
        maxHeight: contentHeight,
        minHeight: LOG_CONTENT_MIN_HEIGHT_PX,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {renderEntries(entries, rawView, filtered)}
    </Box>
  );
}

export default LogViewerContent;
