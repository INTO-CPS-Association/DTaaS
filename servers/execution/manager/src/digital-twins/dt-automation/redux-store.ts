import {
  checkRunningExecutions as checkRunningExecutionsThunk,
  digitalTwinSlice,
  executionHistorySlice,
  fetchDigitalTwins,
  fetchExecutionHistory,
  setDigitalTwin,
} from '@into-cps-association/dt-automation';
import type {
  DTExecutionResult,
  DigitalTwinData,
} from '@into-cps-association/dt-automation';
import { type UnknownAction, configureStore } from '@reduxjs/toolkit';

export type DigitalTwinListing = {
  digitalTwins: DigitalTwinData[];
  error: string | null;
};

type PackageThunk = ReturnType<typeof fetchExecutionHistory>;

export default class ReduxStore {
  private readonly store = configureStore({
    reducer: {
      digitalTwin: digitalTwinSlice,
      executionHistory: executionHistorySlice,
    },
    // The package's actions carry objects that are not serializable.
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  executions(): DTExecutionResult[] {
    return this.store.getState().executionHistory.entries;
  }

  loadExecutionHistory(dtName: string): Promise<void> {
    return this.run(fetchExecutionHistory(dtName));
  }

  checkRunningExecutions(): Promise<void> {
    return this.run(checkRunningExecutionsThunk());
  }

  // The store only ever gains digital twins, so it cannot tell which ones
  // GitLab still lists. This records the ones that one listing sets.
  async listDigitalTwins(): Promise<DigitalTwinListing> {
    const digitalTwins: DigitalTwinData[] = [];
    const errors: string[] = [];
    const dispatch = <A extends UnknownAction>(action: A): A => {
      if (setDigitalTwin.match(action)) {
        digitalTwins.push(action.payload.digitalTwin);
      }
      return this.store.dispatch(action);
    };
    await fetchDigitalTwins(dispatch, (message) => {
      if (message !== null) errors.push(message);
    });
    return { digitalTwins, error: errors.at(-1) ?? null };
  }

  // The package types its thunks as returning void, but each returns a promise.
  private run(thunk: PackageThunk): Promise<void> {
    const result = this.store.dispatch(thunk) as unknown;
    return result instanceof Promise
      ? result.then(() => undefined)
      : Promise.resolve();
  }
}
