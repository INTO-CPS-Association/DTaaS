import { useEffect, useRef, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  TimedTask,
  ExecutionResult,
} from 'model/backend/gitlab/measure/measurement.execution';
import MeasurementTableRow from 'route/measurement/MeasurementTableRow';

export { TaskControls } from 'route/measurement/MeasurementTableCells';

function findLastRunningIndex(results: TimedTask[]): number {
  let last = -1;
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].Status === 'RUNNING') last = i;
  }
  return last;
}

function MeasurementTableHeader() {
  return (
    <TableHead>
      <TableRow>
        <TableCell sx={{ width: '37%', fontWeight: 'bold' }}>Task</TableCell>
        <TableCell align="center" sx={{ width: '10%', fontWeight: 'bold' }}>
          Status
        </TableCell>
        <TableCell align="center" sx={{ width: '15%', fontWeight: 'bold' }}>
          Average Duration
        </TableCell>
        <TableCell align="center" sx={{ width: '26%', fontWeight: 'bold' }}>
          Trials
        </TableCell>
        <TableCell align="center" sx={{ width: '12%', fontWeight: 'bold' }}>
          Data
        </TableCell>
      </TableRow>
    </TableHead>
  );
}

function toggleSetEntry(prev: Set<string>, name: string): Set<string> {
  const next = new Set(prev);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  return next;
}

export default function MeasurementTable({
  results,
  currentTaskIndex,
  currentExecutions,
  onDownloadTask,
  primaryRunnerTag,
  secondaryRunnerTag,
  primaryDTName,
  secondaryDTName,
  isRunning,
  disabledTaskNames,
  onToggleTask,
}: Readonly<{
  results: TimedTask[];
  currentTaskIndex: number | null;
  currentExecutions: ExecutionResult[];
  onDownloadTask: (task: TimedTask) => void;
  primaryRunnerTag: string;
  secondaryRunnerTag: string;
  primaryDTName: string;
  secondaryDTName: string;
  isRunning: boolean;
  disabledTaskNames: string[];
  onToggleTask: (taskName: string) => void;
}>) {
  const runningRowRef = useRef<HTMLTableRowElement | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (taskName: string) => {
    setExpandedRows((prev) => toggleSetEntry(prev, taskName));
  };

  const lastRunningIndex = findLastRunningIndex(results);

  useEffect(() => {
    if (lastRunningIndex >= 0) {
      runningRowRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [lastRunningIndex]);

  return (
    <TableContainer
      component={Paper}
      sx={{ maxHeight: '50vh', overflow: 'auto', clipPath: 'inset(0)' }}
    >
      <Table size="small" sx={{ tableLayout: 'fixed' }}>
        <MeasurementTableHeader />
        <TableBody>
          {results.map((task, index) => (
            <MeasurementTableRow
              key={task['Task Name']}
              task={task}
              index={index}
              currentTaskIndex={currentTaskIndex}
              currentExecutions={currentExecutions}
              onDownloadTask={onDownloadTask}
              primaryRunnerTag={primaryRunnerTag}
              secondaryRunnerTag={secondaryRunnerTag}
              primaryDTName={primaryDTName}
              secondaryDTName={secondaryDTName}
              isExpanded={expandedRows.has(task['Task Name'])}
              onToggle={() => toggleRow(task['Task Name'])}
              rowRef={index === lastRunningIndex ? runningRowRef : undefined}
              isDisabled={disabledTaskNames.includes(task['Task Name'])}
              isRunning={isRunning}
              onToggleEnabled={() => onToggleTask(task['Task Name'])}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
