// Presentational components (trial cards, status indicators, timing displays) for measurements
import { Box, Typography, Tooltip, SxProps, Theme } from '@mui/material';
import {
  ExecutionResult,
  Trial,
  Execution,
  Status,
  getDefaultConfig,
} from 'model/backend/gitlab/measure/measurement.execution';
import { secondsDifference } from 'model/backend/gitlab/measure/measurement.utils';

export const statusColorMap: Record<Status, string> = {
  NOT_STARTED: '#9e9e9e',
  PENDING: '#9e9e9e',
  RUNNING: '#1976d2',
  FAILURE: '#d32f2f',
  SUCCESS: '#2e7d32',
  STOPPED: '#616161',
};

const executionStatusColors: Record<string, string> = {
  success: '#1976d2',
  failed: '#d32f2f',
  cancelled: '#616161',
};

export function getExecutionStatusColor(status: string): string {
  return executionStatusColors[status] ?? '#9e9e9e';
}

const runnerTagColors = {
  primary: { background: '#e8f5e9', border: '#4caf50', text: '#2e7d32' },
  secondary: { background: '#e3f2fd', border: '#42a5f5', text: '#1565c0' },
};

const runnerTagBadge = (color: {
  background: string;
  border: string;
  text: string;
}): SxProps<Theme> => ({
  display: 'inline-flex',
  alignItems: 'center',
  px: 0.6,
  py: 0.15,
  ml: 0.4,
  borderRadius: '10px',
  border: `1.5px solid ${color.border}`,
  backgroundColor: color.background,
  fontSize: '0.65rem',
  fontWeight: 500,
  color: color.text,
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
});

const executionCard: SxProps<Theme> = {
  mb: 0.5,
  p: 1,
  bgcolor: 'grey.100',
  borderRadius: 1,
  textAlign: 'center',
};
const trialCardStyle: SxProps<Theme> = {
  mb: 1.5,
  p: 1,
  border: 1,
  borderColor: 'grey.300',
  borderRadius: 1,
  bgcolor: 'background.paper',
};
const trialHeaderRowStyle: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  mb: 0.5,
};
const trialHeaderLeftStyle: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
};
const bold: SxProps<Theme> = { fontWeight: 'bold' };

interface ExecutionCardProps {
  execution: ExecutionResult;
}

interface TrialCardProps {
  trial: Trial;
  trialIndex: number;
  allTrials?: Trial[];
  expectedTrials?: number;
  isRunning?: boolean;
}

export function ExecutionCard({ execution }: Readonly<ExecutionCardProps>) {
  const statusColor = getExecutionStatusColor(execution.status);

  return (
    <Box sx={executionCard}>
      <Typography variant="body2" sx={bold}>
        {execution.dtName}
        {execution.pipelineId && ` (Pipeline: ${execution.pipelineId})`}
      </Typography>
      <Typography variant="caption" sx={{ color: statusColor }}>
        {execution.status}
      </Typography>
      <Typography variant="caption" display="block" color="text.secondary">
        Runner: {execution.config['Runner tag']}
      </Typography>
    </Box>
  );
}

function trialStatusColor(status: string): string {
  if (status === 'SUCCESS') return '#a5d6a7';
  if (status === 'FAILURE') return '#ef9a9a';
  return '#e0e0e0';
}

function buildPendingRows(
  allTrials: Trial[],
  expectedTrials: number,
  isRunning: boolean,
): { label: string; color: string }[] {
  const pendingStatus = isRunning ? 'RUNNING' : 'PENDING';
  const rows = [
    {
      label: `Trial ${allTrials.length + 1}: ${pendingStatus}`,
      color: '#90caf9',
    },
  ];
  for (let i = allTrials.length + 2; i <= expectedTrials; i += 1) {
    rows.push({ label: `Trial ${i}: PENDING`, color: '#e0e0e0' });
  }
  return rows;
}

function TrialHistoryTooltip({
  allTrials,
  expectedTrials,
  isRunning,
}: Readonly<{
  allTrials: Trial[];
  expectedTrials: number;
  isRunning: boolean;
}>) {
  const completedRows = allTrials.map((t, i) => ({
    label: `Trial ${i + 1}: ${t.Status}`,
    color: trialStatusColor(t.Status),
  }));

  const rows =
    expectedTrials > allTrials.length
      ? [
          ...completedRows,
          ...buildPendingRows(allTrials, expectedTrials, isRunning),
        ]
      : completedRows;

  return (
    <Box>
      {rows.map((row) => (
        <Typography
          key={row.label}
          variant="caption"
          display="block"
          sx={{ color: row.color }}
        >
          {row.label}
        </Typography>
      ))}
    </Box>
  );
}

function buildTooltipContent(
  allTrials: Trial[] | undefined,
  expectedTrials: number | undefined,
  isRunning: boolean | undefined,
) {
  if (
    (allTrials && allTrials.length > 0) ||
    (expectedTrials && expectedTrials > 0)
  ) {
    return (
      <TrialHistoryTooltip
        allTrials={allTrials ?? []}
        expectedTrials={expectedTrials ?? allTrials?.length ?? 0}
        isRunning={isRunning ?? false}
      />
    );
  }
  return '';
}

function TrialHeaderRow({
  trialIndex,
  trial,
}: Readonly<{ trialIndex: number; trial: Trial }>) {
  const hasTiming = !!(trial['Time Start'] && trial['Time End']);
  return (
    <Box sx={trialHeaderRowStyle}>
      <Box sx={trialHeaderLeftStyle}>
        <Typography variant="caption" color="text.secondary" sx={bold}>
          Trial {trialIndex + 1}
        </Typography>
        {trial.Status === 'STOPPED' && (
          <Typography variant="caption" sx={{ color: statusColorMap.STOPPED }}>
            (stopped)
          </Typography>
        )}
      </Box>
      <Typography
        variant="caption"
        color={hasTiming ? 'text.secondary' : 'text.disabled'}
      >
        {hasTiming
          ? `${secondsDifference(trial['Time Start'], trial['Time End'])?.toFixed(1)}s`
          : '—'}
      </Typography>
    </Box>
  );
}

function TrialExecutionList({
  trial,
  executions,
}: Readonly<{ trial: Trial; executions?: Execution[] }>) {
  if (trial.Execution.length > 0) {
    return (
      <>
        {trial.Execution.map((execution) => (
          <ExecutionCard
            key={`execution-${execution.dtName}-${execution.pipelineId ?? execution.executionIndex ?? 'pending'}`}
            execution={execution}
          />
        ))}
      </>
    );
  }
  return (
    <>
      {(executions ?? []).map((exp, i) => (
        <ExecutionCard
          key={`expected-${exp.dtName}-${i}`}
          execution={{
            dtName: exp.dtName,
            pipelineId: null,
            status: '—',
            config: { ...getDefaultConfig(), ...exp.config },
            executionIndex: i,
          }}
        />
      ))}
    </>
  );
}

export function TrialCard({
  trial,
  trialIndex,
  executions,
  allTrials,
  expectedTrials,
  isRunning,
}: Readonly<TrialCardProps & { executions?: Execution[] }>) {
  return (
    <Tooltip
      title={buildTooltipContent(allTrials, expectedTrials, isRunning)}
      arrow
      placement="left"
      slotProps={{ popper: { disablePortal: true } }}
    >
      <Box sx={trialCardStyle}>
        <TrialHeaderRow trialIndex={trialIndex} trial={trial} />
        <TrialExecutionList trial={trial} executions={executions} />
      </Box>
    </Tooltip>
  );
}

export function RunnerTagBadge({
  runnerTag,
  variant,
}: Readonly<{
  runnerTag: string;
  variant: 'primary' | 'secondary';
}>) {
  const color = runnerTagColors[variant];
  const tooltipText =
    variant === 'primary' ? 'Primary runner tag' : 'Secondary runner tag';

  return (
    <Tooltip title={tooltipText} arrow>
      <Box component="span" sx={runnerTagBadge(color)}>
        {runnerTag}
      </Box>
    </Tooltip>
  );
}
