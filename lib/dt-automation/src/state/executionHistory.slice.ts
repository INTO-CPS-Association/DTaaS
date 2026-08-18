import {
  PayloadAction,
  createSlice,
  ThunkAction,
  Action,
} from '@reduxjs/toolkit';
import { DTExecutionResult, JobLog } from 'src/gitlab/types/executionHistory';
import { DigitalTwinData } from 'src/state/digitalTwin.slice';
import { ExecutionStatus } from 'src/interfaces/execution';
import {
  ShowNotificationPayload,
  IExecutionHistoryStorage,
} from 'src/interfaces/sharedInterfaces';
import ExecutionStatusService from 'src/state/ExecutionStatusService';

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

type StorageDeletionResult =
  { success: true } | { success: false; error: unknown };

async function deleteStoredExecution(
  id: string,
): Promise<StorageDeletionResult> {
  try {
    await storageService.delete(id);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

function findExecutionById(
  entries: DTExecutionResult[],
  id: string,
): DTExecutionResult | undefined {
  return entries.find((entry) => entry.id === id);
}

type AppDispatch = Parameters<AppThunk>[0];

async function removeExecutionAndNotify(
  dispatch: AppDispatch,
  id: string,
  execution: DTExecutionResult,
): Promise<void> {
  dispatch(removeExecutionHistoryEntry(id));

  const deletion = await deleteStoredExecution(id);
  if (!deletion.success) {
    dispatch(addExecutionHistoryEntry(execution));
    dispatch(setError(`Failed to remove execution: ${deletion.error}`));
    return;
  }

  dispatch(setError(null));
  dispatch({
    type: 'snackbar/showSnackbar',
    payload: {
      message: `Deleted entry ${formatTimestamp(execution.timestamp)} from ${formatName(execution.dtName)} execution history`,
      severity: 'warning',
      icon: 'ClearIcon',
    },
  });
}

export const removeExecution =
  (id: string): AppThunk =>
  async (dispatch, getState) => {
    const execution = findExecutionById(
      getState().executionHistory.entries,
      id,
    );

    if (!execution) {
      return;
    }

    await removeExecutionAndNotify(dispatch, id, execution);
  };

function getDeletableEntries(
  entries: DTExecutionResult[],
  dtName: string,
): DTExecutionResult[] {
  return entries.filter(
    (entry) =>
      entry.dtName === dtName && entry.status !== ExecutionStatus.RUNNING,
  );
}

async function deleteDTEntries(
  entries: DTExecutionResult[],
): Promise<StorageDeletionResult> {
  try {
    await Promise.all(entries.map((entry) => storageService.delete(entry.id)));
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export const clearExecutionHistoryForDT =
  (dtName: string): AppThunk =>
  async (dispatch, getState) => {
    const state = getState();
    const entriesToDelete = getDeletableEntries(
      state.executionHistory.entries,
      dtName,
    );

    const deletion = await deleteDTEntries(entriesToDelete);
    if (!deletion.success) {
      dispatch(
        setError(`Failed to clear execution history: ${deletion.error}`),
      );
      return;
    }

    entriesToDelete.forEach((entry) =>
      dispatch(removeExecutionHistoryEntry(entry.id)),
    );
    dispatch(setError(null));
    dispatch({
      type: 'snackbar/showSnackbar',
      payload: buildClearHistoryNotification(dtName, entriesToDelete.length),
    });
  };

function getRunningExecutions(
  entries: DTExecutionResult[],
): DTExecutionResult[] {
  return entries.filter((entry) => entry.status === ExecutionStatus.RUNNING);
}

function refreshRunningExecutions(
  runningExecutions: DTExecutionResult[],
  digitalTwins: Record<string, DigitalTwinData>,
): Promise<DTExecutionResult[]> {
  return runningExecutions.length === 0
    ? Promise.resolve([])
    : ExecutionStatusService.checkRunningExecutions(
        runningExecutions,
        digitalTwins,
        storageService,
      );
}

export const checkRunningExecutions =
  (): AppThunk => async (dispatch, getState) => {
    const state = getState();
    const runningExecutions = getRunningExecutions(
      state.executionHistory.entries,
    );

    try {
      const updatedExecutions = await refreshRunningExecutions(
        runningExecutions,
        state.digitalTwin.digitalTwin,
      );
      updatedExecutions.forEach((execution) =>
        dispatch(updateExecutionHistoryEntry(execution)),
      );
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
