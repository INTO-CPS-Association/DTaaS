import { Ref } from 'react';
import { TableCell, TableRow } from '@mui/material';
import {
  TimedTask,
  ExecutionResult,
  Trial,
} from 'model/backend/gitlab/measure/measurement.execution';
import { statusColorMap } from 'route/measurement/MeasurementComponents';
import { getRunnerTags } from 'model/backend/gitlab/measure/measurement.utils';
import {
  AverageTimeCell,
  ExpandedDescriptionRow,
  TaskControls,
  TaskNameCell,
  TrialCardCell,
} from 'route/measurement/MeasurementTableCells';

interface RowState {
  primaryTag: string | null | undefined;
  secondaryTag: string | null | undefined;
  isActiveTask: boolean;
  isNotStartedOrPending: boolean;
  latestTrial: Trial | undefined;
}

interface RowContext {
  currentTaskIndex: number | null;
  currentExecutions: ExecutionResult[];
  primaryRunnerTag: string;
  secondaryRunnerTag: string;
}

function deriveRowState(
  task: TimedTask,
  index: number,
  ctx: RowContext,
): RowState {
  const { primaryTag, secondaryTag } = getRunnerTags(
    task,
    ctx.primaryRunnerTag,
    ctx.secondaryRunnerTag,
  );
  const isActiveTask =
    index === ctx.currentTaskIndex &&
    task.Trials.length < (task.ExpectedTrials ?? Infinity);
  const isNotStartedOrPending =
    task.Status === 'NOT_STARTED' || task.Status === 'PENDING';
  const latestTrial: Trial | undefined = isActiveTask
    ? {
        'Time Start': undefined,
        'Time End': undefined,
        Execution: ctx.currentExecutions,
        Status: 'RUNNING',
        Error: undefined,
      }
    : task.Trials[task.Trials.length - 1];
  return {
    primaryTag,
    secondaryTag,
    isActiveTask,
    isNotStartedOrPending,
    latestTrial,
  };
}

interface MeasurementTableRowProps {
  task: TimedTask;
  index: number;
  currentTaskIndex: number | null;
  currentExecutions: ExecutionResult[];
  onDownloadTask: (task: TimedTask) => void;
  primaryRunnerTag: string;
  secondaryRunnerTag: string;
  primaryDTName: string;
  secondaryDTName: string;
  isExpanded: boolean;
  onToggle: () => void;
  rowRef?: Ref<HTMLTableRowElement>;
  isDisabled: boolean;
  isRunning: boolean;
  onToggleEnabled: () => void;
}

function MeasurementTableRow({
  task,
  index,
  currentTaskIndex,
  currentExecutions,
  onDownloadTask,
  primaryRunnerTag,
  secondaryRunnerTag,
  primaryDTName,
  secondaryDTName,
  isExpanded,
  onToggle,
  rowRef,
  isDisabled,
  isRunning,
  onToggleEnabled,
}: Readonly<MeasurementTableRowProps>) {
  const rowState = deriveRowState(task, index, {
    currentTaskIndex,
    currentExecutions,
    primaryRunnerTag,
    secondaryRunnerTag,
  });

  return (
    <>
      <TableRow
        ref={rowRef}
        hover
        onClick={onToggle}
        sx={{ cursor: 'pointer', opacity: isDisabled ? 0.45 : 1 }}
        data-logger-element="table-row"
        data-logger-label="Toggle Task Details"
        data-logger-context={JSON.stringify({
          measurement: {
            task: task['Task Name'],
            button: 'toggle-task-details',
          },
        })}
      >
        <TaskNameCell
          index={index}
          task={task}
          primaryTag={rowState.primaryTag}
          secondaryTag={rowState.secondaryTag}
        />
        <TableCell align="center" sx={{ color: statusColorMap[task.Status] }}>
          {task.Status === 'NOT_STARTED' ? '—' : task.Status}
        </TableCell>
        <AverageTimeCell averageTime={task['Average Time (s)']} />
        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
          <TrialCardCell
            task={task}
            isActiveTask={rowState.isActiveTask}
            isNotStartedOrPending={rowState.isNotStartedOrPending}
            latestTrial={rowState.latestTrial}
          />
        </TableCell>
        <TableCell
          align="center"
          sx={{ verticalAlign: 'middle' }}
          onClick={(e) => e.stopPropagation()}
        >
          <TaskControls task={task} onDownloadTask={onDownloadTask} />
        </TableCell>
      </TableRow>
      <ExpandedDescriptionRow
        isExpanded={isExpanded}
        description={task.Description ?? ''}
        taskName={task['Task Name']}
        primaryDTName={primaryDTName}
        secondaryDTName={secondaryDTName}
        isDisabled={isDisabled}
        isRunning={isRunning}
        onToggleEnabled={onToggleEnabled}
      />
    </>
  );
}

export default MeasurementTableRow;
