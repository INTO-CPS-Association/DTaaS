import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Box, Button } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { showSnackbar } from 'store/snackbar.slice';
import { LogEvent } from 'util/logger/logEvent';
import { toDisplayJsonLines } from 'page/logViewer/logViewerUtils';

function RawLogView({ entries }: Readonly<{ entries: LogEvent[] }>) {
  const dispatch = useDispatch();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const rawText = toDisplayJsonLines(entries);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
    } catch {
      dispatch(
        showSnackbar({
          message: 'Could not copy logs to clipboard.',
          severity: 'error',
        }),
      );
    }
  };

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
          data-logger-element="button"
          data-logger-label="Copy Logs"
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
          overflowWrap: 'anywhere',
        }}
      >
        {rawText}
      </Box>
    </>
  );
}

export default RawLogView;
