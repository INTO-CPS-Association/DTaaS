import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchAllExecutionHistory,
  checkRunningExecutions,
} from 'model/backend/state/executionHistory.slice';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import { RootState } from 'store/store';
import { EXECUTION_CHECK_INTERVAL } from 'model/backend/gitlab/digitalTwinConfig/constants';

const ExecutionHistoryLoader: React.FC = () => {
  const dispatch =
    useDispatch<ThunkDispatch<RootState, unknown, Action<string>>>();

  useEffect(() => {
    dispatch(fetchAllExecutionHistory());

    const intervalId = setInterval(() => {
      dispatch(checkRunningExecutions());
    }, EXECUTION_CHECK_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [dispatch]);

  return null;
};

export default ExecutionHistoryLoader;
