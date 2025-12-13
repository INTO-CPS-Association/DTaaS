import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'store/store';

export const selectExecutionHistoryEntries = (state: RootState) =>
  state.executionHistory.entries;

export const selectExecutionHistoryByDTName = (dtName: string) =>
  createSelector(
    [(state: RootState) => state.executionHistory.entries],
    (entries) => entries.filter((entry) => entry.dtName === dtName),
  );

export const _selectExecutionHistoryByDTName =
  (dtName: string) => (state: RootState) =>
    state.executionHistory.entries.filter((entry) => entry.dtName === dtName);

export const selectExecutionHistoryById = (id: string) =>
  createSelector(
    [(state: RootState) => state.executionHistory.entries],
    (entries) => entries.find((entry) => entry.id === id),
  );

// Gets selected execution ID
export const selectSelectedExecutionId = (state: RootState) =>
  state.executionHistory.selectedExecutionId;

export const selectSelectedExecution = createSelector(
  [
    (state: RootState) => state.executionHistory.entries,
    (state: RootState) => state.executionHistory.selectedExecutionId,
  ],
  (entries, selectedId) => {
    if (!selectedId) return null;
    return entries.find((entry) => entry.id === selectedId);
  },
);

export const selectExecutionHistoryLoading = (state: RootState) =>
  state.executionHistory.loading;

export const selectExecutionHistoryError = (state: RootState) =>
  state.executionHistory.error;
