import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatName } from 'model/backend/digitalTwin';
import {
  fetchExecutionHistory,
  clearExecutionHistoryForDT,
} from 'model/backend/state/executionHistory.slice';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import { RootState } from 'store/store';
import { selectExecutionHistoryByDTName } from 'route/digitaltwins/execution';
import UnifiedDialog from 'components/logDialog/UnifiedDialog';
import DeleteAllConfirmationDialog from 'components/logDialog/DeleteAllConfirmationDialog';
import { ShowNotificationPayload } from 'model/backend/interfaces/sharedInterfaces';

interface LogDialogProps {
  readonly showLog: boolean;
  readonly setShowLog: Dispatch<SetStateAction<boolean>>;
  readonly name: string;
}

function LogDialog({ showLog, setShowLog, name }: LogDialogProps) {
  const dispatch =
    useDispatch<ThunkDispatch<RootState, unknown, Action<string>>>();

  const executions = useSelector(selectExecutionHistoryByDTName(name)) ?? [];

  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  useEffect(() => {
    if (showLog) {
      // Use the thunk action creator directly
      dispatch(fetchExecutionHistory(name));
    }
  }, [dispatch, name, showLog]);

  const handleCloseLog = useCallback(() => {
    setDeleteAllDialogOpen(false);
    setShowLog(false);
  }, [setShowLog]);

  const handleViewLogs = useCallback(() => {}, []);

  const handleClearAllClick = useCallback(() => {
    if (executions.length === 0) {
      dispatch(
        dispatch({
          type: 'snackbar/showSnackbar',
          payload: {
            message: 'Execution history is already empty',
            severity: 'info',
          } as ShowNotificationPayload,
        }),
      );
      return;
    }
    setDeleteAllDialogOpen(true);
  }, [dispatch, executions.length]);

  const handleClearAllConfirm = useCallback(() => {
    dispatch(clearExecutionHistoryForDT(name));
    setDeleteAllDialogOpen(false);
  }, [dispatch, name]);

  const handleClearAllCancel = useCallback(() => {
    setDeleteAllDialogOpen(false);
  }, []);

  const title = useMemo(() => `${formatName(name)} Execution History`, [name]);

  return (
    <UnifiedDialog
      open={showLog}
      title={title}
      dtName={name}
      onClose={handleCloseLog}
      onClearAll={handleClearAllClick}
      onViewLogs={handleViewLogs}
      deleteAllDialog={
        <DeleteAllConfirmationDialog
          open={deleteAllDialogOpen}
          dtName={formatName(name)}
          onClose={handleClearAllCancel}
          onConfirm={handleClearAllConfirm}
        />
      }
    />
  );
}

export default LogDialog;
