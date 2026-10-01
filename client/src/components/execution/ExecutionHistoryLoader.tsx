import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchAllExecutionHistory,
  checkRunningExecutions,
  EXECUTION_CHECK_INTERVAL,
} from '@into-cps-association/dt-automation';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import { RootState } from 'store/store';

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
