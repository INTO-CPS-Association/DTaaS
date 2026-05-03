import {
  PayloadAction,
  createSlice,
  ThunkAction,
  Action,
} from '@reduxjs/toolkit';
import {
  DTExecutionResult,
  JobLog,
} from 'model/backend/gitlab/types/executionHistory';
import { DigitalTwinData } from 'model/backend/state/digitalTwin.slice';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import {
  ShowNotificationPayload,
  IExecutionHistoryStorage,
} from 'model/backend/interfaces/sharedInterfaces';
import ExecutionStatusService from 'model/backend/state/ExecutionStatusService';

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const formatName = (name: string) =>
  name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase()); // replaceAll is unavailable

type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  {
    executionHistory: ExecutionHistoryState;
    digitalTwin: { digitalTwin: Record<string, DigitalTwinData> };
  },
  unknown,
  Action<string>
>;

interface ExecutionHistoryState {
  entries: DTExecutionResult[];
  selectedExecutionId: string | null;
  loading: boolean;
  error: string | null;
}

export type { ExecutionHistoryState };

const initialState: ExecutionHistoryState = {
  entries: [],
  selectedExecutionId: null,
  loading: false,
  error: null,
};

function buildClearHistoryNotification(
  dtName: string,
  deletedCount: number,
): ShowNotificationPayload {
  if (deletedCount === 0) {
    return {
      message: 'Execution history is already empty or only has active entries',
      severity: 'info',
    };
  }
  return {
    message: `Deleted all entries from ${formatName(dtName)} execution history`,
    severity: 'warning',
    icon: 'ClearIcon',
  };
}

let storageService: IExecutionHistoryStorage;

export const setStorageService = (service: IExecutionHistoryStorage) => {
  storageService = service;
};

const executionHistorySlice = createSlice({
  name: 'executionHistory',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setExecutionHistoryEntries: (
      state,
      action: PayloadAction<DTExecutionResult[]>,
    ) => {
      state.entries = action.payload;
    },
    setExecutionHistoryEntriesForDT: (
      state,
      action: PayloadAction<{
        dtName: string;
        entries: DTExecutionResult[];
      }>,
    ) => {
      state.entries = state.entries.filter(
        (entry) => entry.dtName !== action.payload.dtName,
      );
      state.entries.push(...action.payload.entries);
    },
    addExecutionHistoryEntry: (
      state,
      action: PayloadAction<DTExecutionResult>,
    ) => {
      state.entries.push(action.payload);
    },
    updateExecutionHistoryEntry: (
      state,
      action: PayloadAction<DTExecutionResult>,
    ) => {
      const index = state.entries.findIndex(
        (entry) => entry.id === action.payload.id,
      );
      if (index !== -1) {
        state.entries[index] = action.payload;
      }
    },
    updateExecutionStatus: (
      state,
      action: PayloadAction<{ id: string; status: ExecutionStatus }>,
    ) => {
      const index = state.entries.findIndex(
        (entry) => entry.id === action.payload.id,
      );
      if (index !== -1) {
        state.entries[index].status = action.payload.status;
      }
    },
    updateExecutionLogs: (
      state,
      action: PayloadAction<{ id: string; logs: JobLog[] }>,
    ) => {
      const index = state.entries.findIndex(
        (entry) => entry.id === action.payload.id,
      );
      if (index !== -1) {
        state.entries[index].jobLogs = action.payload.logs;
      }
    },
    removeExecutionHistoryEntry: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter(
        (entry) => entry.id !== action.payload,
      );
    },
    removeEntriesForDT: (state, action: PayloadAction<string>) => {
      const dtName = action.payload;
      state.entries = state.entries.filter((entry) => entry.dtName !== dtName);
    },
    setSelectedExecutionId: (state, action: PayloadAction<string | null>) => {
      state.selectedExecutionId = action.payload;
    },
    clearEntries: (state) => {
      state.entries = [];
      state.selectedExecutionId = null;
    },
  },
});

// Thunks
export const fetchExecutionHistory =
  (dtName: string): AppThunk =>
  async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const entries = await storageService.getByDTName(dtName);
      dispatch(setExecutionHistoryEntriesForDT({ dtName, entries }));

      dispatch(checkRunningExecutions());

      dispatch(setError(null));
    } catch (error) {
      dispatch(setError(`Failed to fetch execution history: ${error}`));
    } finally {
      dispatch(setLoading(false));
    }
  };

export const fetchAllExecutionHistory = (): AppThunk => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const entries = await storageService.getAll();
    dispatch(setExecutionHistoryEntries(entries));

    dispatch(checkRunningExecutions());

    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(`Failed to fetch all execution history: ${error}`));
  } finally {
    dispatch(setLoading(false));
  }
};

export const addExecution =
  (entry: DTExecutionResult): AppThunk =>
  async (dispatch) => {
    dispatch(setLoading(true));
    try {
      await storageService.add(entry);
      dispatch(addExecutionHistoryEntry(entry));
      dispatch(setError(null));
    } catch (error) {
      dispatch(setError(`Failed to add execution: ${error}`));
    } finally {
      dispatch(setLoading(false));
    }
  };

export const updateExecution =
  (entry: DTExecutionResult): AppThunk =>
  async (dispatch) => {
    dispatch(setLoading(true));
    try {
      await storageService.update(entry);
      dispatch(updateExecutionHistoryEntry(entry));
      dispatch(setError(null));
    } catch (error) {
      dispatch(setError(`Failed to update execution: ${error}`));
    } finally {
      dispatch(setLoading(false));
    }
  };

export const removeExecution =
  (id: string): AppThunk =>
  async (dispatch, getState) => {
    const state = getState();
    const execution = state.executionHistory.entries.find(
      (entry: DTExecutionResult) => entry.id === id,
    );

    if (!execution) {
      return;
    }

    dispatch(removeExecutionHistoryEntry(id));

    try {
      await storageService.delete(id);
      dispatch(setError(null));
      dispatch({
        type: 'snackbar/showSnackbar',
        payload: {
          message: `Deleted entry ${formatTimestamp(execution.timestamp)} from ${formatName(execution.dtName)} execution history`,
          severity: 'warning',
          icon: 'ClearIcon',
        } as ShowNotificationPayload,
      });
    } catch (error) {
      if (execution) {
        dispatch(addExecutionHistoryEntry(execution));
      }
      dispatch(setError(`Failed to remove execution: ${error}`));
    }
  };

async function deleteDTEntries(entries: DTExecutionResult[]): Promise<void> {
  await Promise.all(entries.map((entry) => storageService.delete(entry.id)));
}

export const clearExecutionHistoryForDT =
  (dtName: string): AppThunk =>
  async (dispatch, getState) => {
    const state = getState();
    const entriesToDelete = state.executionHistory.entries.filter(
      (entry) =>
        entry.dtName === dtName && entry.status !== ExecutionStatus.RUNNING,
    );

    try {
      await deleteDTEntries(entriesToDelete);
    } catch (error) {
      dispatch(setError(`Failed to clear execution history: ${error}`));
      return;
    }

    for (const entry of entriesToDelete) {
      dispatch(removeExecutionHistoryEntry(entry.id));
    }
    dispatch(setError(null));
    dispatch({
      type: 'snackbar/showSnackbar',
      payload: buildClearHistoryNotification(dtName, entriesToDelete.length),
    });
  };

export const checkRunningExecutions =
  (): AppThunk => async (dispatch, getState) => {
    const state = getState();
    const runningExecutions = state.executionHistory.entries.filter(
      (entry: DTExecutionResult) => entry.status === ExecutionStatus.RUNNING,
    );

    if (runningExecutions.length === 0) {
      return;
    }

    try {
      const updatedExecutions =
        await ExecutionStatusService.checkRunningExecutions(
          runningExecutions,
          state.digitalTwin.digitalTwin,
          storageService,
        );

      for (const updatedExecution of updatedExecutions) {
        dispatch(updateExecutionHistoryEntry(updatedExecution));
      }
    } catch (error) {
      dispatch(setError(`Failed to check execution status: ${error}`));
    }
  };

export const {
  setLoading,
  setError,
  setExecutionHistoryEntries,
  setExecutionHistoryEntriesForDT,
  addExecutionHistoryEntry,
  updateExecutionHistoryEntry,
  updateExecutionStatus,
  updateExecutionLogs,
  removeExecutionHistoryEntry,
  removeEntriesForDT,
  setSelectedExecutionId,
  clearEntries,
} = executionHistorySlice.actions;

export default executionHistorySlice.reducer;
