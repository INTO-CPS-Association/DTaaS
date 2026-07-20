import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import DataObjectIcon from '@mui/icons-material/DataObject';

interface LogViewerControlsProps {
  downloadLabel: string;
  onDownload: () => void;
  downloadDisabled: boolean;
  onClearClick: () => void;
  clearDisabled: boolean;
  onRefresh: () => void;
  rawView: boolean;
  onToggleRawView: () => void;
  liveUpdate: boolean;
  onLiveUpdateChange: (checked: boolean) => void;
}

function LogViewerControls({
  downloadLabel,
  onDownload,
  downloadDisabled,
  onClearClick,
  clearDisabled,
  onRefresh,
  rawView,
  onToggleRawView,
  liveUpdate,
  onLiveUpdateChange,
}: Readonly<LogViewerControlsProps>) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        alignItems: 'center',
        marginLeft: 'auto',
      }}
    >
      <Tooltip title="Refresh">
        <IconButton
          onClick={onRefresh}
          aria-label="Refresh logs"
          data-testid="refresh-logs"
        >
          <RefreshIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title={rawView ? 'Card view' : 'Raw view'}>
        <ToggleButton
          value="raw"
          size="small"
          selected={rawView}
          onChange={onToggleRawView}
          aria-label="Toggle raw view"
          data-testid="raw-view-toggle"
        >
          <DataObjectIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Clear logs">
        <span>
          <IconButton
            onClick={onClearClick}
            disabled={clearDisabled}
            aria-label="Clear logs"
            data-testid="clear-logs"
            sx={{ '&:hover': { color: 'error.main' } }}
          >
            <DeleteOutlinedIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Button
        variant="contained"
        startIcon={<DownloadIcon />}
        onClick={onDownload}
        disabled={downloadDisabled}
        data-testid="download-logs"
      >
        {downloadLabel}
      </Button>
      <FormControlLabel
        sx={{ marginLeft: 0.5, marginRight: 0 }}
        control={
          <Switch
            checked={liveUpdate}
            onChange={(event) => onLiveUpdateChange(event.target.checked)}
            slotProps={{ input: { 'aria-label': 'Live update logs' } }}
            data-testid="live-update-logs"
          />
        }
        label="Live update"
      />
    </Box>
  );
}

export default LogViewerControls;
