import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Box, Button, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { showSnackbar } from 'store/snackbar.slice';
import { LogEvent } from 'util/logger/logEvent';
import {
  MAX_RENDERED_LOG_ENTRIES,
  getRenderCapNote,
  toDisplayJsonLines,
  toPrettyDisplayJson,
} from 'page/logViewer/logViewerUtils';

function useTemporaryFlag(timeout: number): [boolean, () => void] {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => setActive(false), timeout);
    return () => clearTimeout(timer);
  }, [active, timeout]);
  return [active, () => setActive(true)];
}

async function copyToClipboard(
  text: string,
  onSuccess: () => void,
  onError: () => void,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    onSuccess();
  } catch {
    onError();
  }
}

function RawLogView({ entries }: Readonly<{ entries: LogEvent[] }>) {
  const dispatch = useDispatch();
  const [copied, markCopied] = useTemporaryFlag(2000);

  // The pretty text is capped for rendering; the copy handler serializes on
  // demand and always covers every entry.
  const prettyText = useMemo(
    () => toPrettyDisplayJson(entries.slice(0, MAX_RENDERED_LOG_ENTRIES)),
    [entries],
  );
  const capNote = getRenderCapNote(entries.length);

  const handleCopy = () =>
    copyToClipboard(toDisplayJsonLines(entries), markCopied, () => {
      dispatch(
        showSnackbar({
          message: 'Could not copy logs to clipboard.',
          severity: 'error',
        }),
      );
    });

  return (
    <>
      <Box
        sx={{ position: 'sticky', top: 0, alignSelf: 'flex-end', zIndex: 1 }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
          onClick={handleCopy}
          sx={{ backgroundColor: 'background.paper' }}
          data-testid="copy-logs"
        >
          {copied ? 'Copied' : 'Copy to clipboard'}
        </Button>
      </Box>
      <Box
        component="pre"
        data-testid="raw-log-content"
        sx={{
          m: 0,
          fontFamily: 'monospace',
          fontSize: '0.8125rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {prettyText}
      </Box>
      {capNote && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {capNote}
        </Typography>
      )}
    </>
  );
}

export default RawLogView;
