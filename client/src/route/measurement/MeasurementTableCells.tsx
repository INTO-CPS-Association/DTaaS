import {
  Box,
  Checkbox,
  Collapse,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  TimedTask,
  Trial,
} from 'model/backend/gitlab/measure/measurement.execution';
import {
  TrialCard,
  RunnerTagBadge,
} from 'route/measurement/MeasurementComponents';
import { isTaskComplete } from 'model/backend/gitlab/measure/measurement.utils';

export function TaskControls({
  task,
  onDownloadTask,
}: Readonly<{
  task: TimedTask;
  onDownloadTask: (task: TimedTask) => void;
}>) {
  const canDownload = task.Trials.some(isTaskComplete);

  if (!canDownload) {
    return (
      <Typography variant="body1" color="text.disabled">
        —
      </Typography>
    );
  }

  return (
    <Tooltip title="Download task results as JSON" arrow>
      <Typography
        component="button"
        type="button"
        variant="caption"
        sx={{
          color: 'primary.main',
          cursor: 'pointer',
          textDecoration: 'underline',
          fontSize: '0.7rem',
          background: 'none',
          border: 'none',
          p: 0,
          fontFamily: 'inherit',
        }}
        onClick={() => onDownloadTask(task)}
        data-logger-element="button"
        data-logger-label="Download Task Results"
        data-logger-context={JSON.stringify({
          measurement: { task: task['Task Name'], button: 'download-task' },
        })}
      >
        Download Task Results
      </Typography>
    </Tooltip>
  );
}

export function TrialCardCell({
  task,
  isActiveTask,
  isNotStartedOrPending,
  latestTrial,
}: Readonly<{
  task: TimedTask;
  isActiveTask: boolean;
  isNotStartedOrPending: boolean;
  latestTrial: Trial | undefined;
}>) {
  if (isNotStartedOrPending) {
    return (
      <Typography variant="body1" color="text.disabled">
        —
      </Typography>
    );
  }
  if (!latestTrial) return null;

  return (
    <TrialCard
      trial={latestTrial}
      trialIndex={isActiveTask ? task.Trials.length : task.Trials.length - 1}
      executions={task.Executions?.()}
      allTrials={task.Trials}
      expectedTrials={task.ExpectedTrials}
      isRunning={isActiveTask}
    />
  );
}

export function TaskNameCell({
  index,
  task,
  primaryTag,
  secondaryTag,
}: Readonly<{
  index: number;
  task: TimedTask;
  primaryTag: string | null | undefined;
  secondaryTag: string | null | undefined;
}>) {
  return (
    <TableCell>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="body2" color="grey.500" sx={{ minWidth: '20px' }}>
          {index + 1}
        </Typography>
        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {task['Task Name']}
            </Typography>
            {primaryTag && (
              <RunnerTagBadge runnerTag={primaryTag} variant="primary" />
            )}
            {secondaryTag && (
              <RunnerTagBadge runnerTag={secondaryTag} variant="secondary" />
            )}
          </Box>
        </Box>
      </Box>
    </TableCell>
  );
}

export function AverageTimeCell({
  averageTime,
}: Readonly<{ averageTime: number | undefined }>) {
  return (
    <TableCell align="center">
      {averageTime === undefined ? (
        <Typography variant="body1" color="text.disabled">
          —
        </Typography>
      ) : (
        `${averageTime.toFixed(1)}s`
      )}
    </TableCell>
  );
}

function resolveDescription(
  description: string,
  primaryDTName: string,
  secondaryDTName: string,
): string {
  return description
    .replace(/\bprimary\b/gi, primaryDTName)
    .replace(/\bsecondary\b/gi, secondaryDTName);
}

export function ExpandedDescriptionRow({
  isExpanded,
  description,
  taskName,
  primaryDTName,
  secondaryDTName,
  isDisabled,
  isRunning,
  onToggleEnabled,
}: Readonly<{
  isExpanded: boolean;
  description: string;
  taskName: string;
  primaryDTName: string;
  secondaryDTName: string;
  isDisabled: boolean;
  isRunning: boolean;
  onToggleEnabled: () => void;
}>) {
  return (
    <TableRow>
      <TableCell
        colSpan={5}
        sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Collapse in={isExpanded}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 1,
              py: 1,
              gap: 1,
            }}
          >
            <Tooltip
              title={
                isRunning
                  ? 'Stop the measurement to change task selection'
                  : 'Include in measurement run'
              }
              arrow
            >
              <span>
                <Checkbox
                  checked={!isDisabled}
                  onChange={onToggleEnabled}
                  disabled={isRunning}
                  size="small"
                  sx={{ p: 0 }}
                  data-logger-element="checkbox"
                  data-logger-label="Toggle Task Enabled"
                  data-logger-capture-value="true"
                  data-logger-context={JSON.stringify({
                    measurement: { task: taskName, button: 'toggle-enabled' },
                  })}
                />
              </span>
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              {resolveDescription(description, primaryDTName, secondaryDTName)}
            </Typography>
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}
