import { createSelector } from '@reduxjs/toolkit';
import type { ExecutionHistoryStoreSlice } from 'model/store/modelRootState';

export const selectExecutionHistoryEntries = (
  state: ExecutionHistoryStoreSlice,
) => state.executionHistory.entries;

export const selectExecutionHistoryByDTName = (dtName: string) =>
  createSelector(
    [(state: ExecutionHistoryStoreSlice) => state.executionHistory.entries],
    (entries) => entries.filter((entry) => entry.dtName === dtName),
  );

export const selectExecutionHistoryById = (id: string) =>
  createSelector(
    [(state: ExecutionHistoryStoreSlice) => state.executionHistory.entries],
    (entries) => entries.find((entry) => entry.id === id),
  );

// Gets selected execution ID
export const selectSelectedExecutionId = (state: ExecutionHistoryStoreSlice) =>
  state.executionHistory.selectedExecutionId;

export const selectSelectedExecution = createSelector(
  [
    (state: ExecutionHistoryStoreSlice) => state.executionHistory.entries,
    (state: ExecutionHistoryStoreSlice) =>
      state.executionHistory.selectedExecutionId,
  ],
  (entries, selectedId) => {
    if (!selectedId) return null;
    return entries.find((entry) => entry.id === selectedId);
  },
);

export const selectExecutionHistoryLoading = (
  state: ExecutionHistoryStoreSlice,
) => state.executionHistory.loading;

export const selectExecutionHistoryError = (
  state: ExecutionHistoryStoreSlice,
) => state.executionHistory.error;
