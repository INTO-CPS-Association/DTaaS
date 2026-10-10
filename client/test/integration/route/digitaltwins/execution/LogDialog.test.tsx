import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import LogDialog from 'components/LogDialog';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  digitalTwinSlice as digitalTwinReducer,
  setDigitalTwin,
  DigitalTwinData,
  executionHistorySlice as executionHistoryReducer,
  extractDataFromDigitalTwin,
  ExecutionStatus,
} from '@into-cps-association/dt-automation';
import { mockDigitalTwin } from 'test/__mocks__/global_mocks';
import { setExecutionHistoryEntries } from 'test/integration/integration.testUtil';

jest.mock('@into-cps-association/dt-automation', () => ({
  ...jest.requireActual('@into-cps-association/dt-automation'),
  fetchExecutionHistory: jest.fn(() => ({
    type: 'test/fetchExecutionHistory',
  })),
}));

jest.mock('database/executionHistoryDB', () => ({
  __esModule: true,
  default: {
    getByDTName: jest.fn().mockResolvedValue([]),
    getAll: jest.fn().mockResolvedValue([]),
    add: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

const executionHistoryDB = jest.requireMock(
  'database/executionHistoryDB',
).default;

const store = configureStore({
  reducer: combineReducers({
    digitalTwin: digitalTwinReducer,
    executionHistory: executionHistoryReducer,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  preloadedState: {
    executionHistory: {
      entries: [],
      selectedExecutionId: null,
      loading: false,
      error: null,
    },
  },
});

describe('LogDialog', () => {
  const assetName = 'mockedDTName';
  const setShowLog = jest.fn();

  const renderLogDialog = async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <LogDialog name={assetName} showLog={true} setShowLog={setShowLog} />
        </Provider>,
      );
    });
  };

  beforeEach(() => {
    const digitalTwinData: DigitalTwinData =
      extractDataFromDigitalTwin(mockDigitalTwin);

    store.dispatch(
      setDigitalTwin({
        assetName: 'mockedDTName',
        digitalTwin: digitalTwinData,
      }),
    );
  });

  it('renders the LogDialog with execution history', async () => {
    const entry = {
      id: 'test-execution-1',
      dtName: assetName,
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.COMPLETED,
      jobLogs: [{ jobName: 'job', log: 'testLog' }],
    };
    executionHistoryDB.getByDTName.mockResolvedValueOnce([entry]);
    store.dispatch(setExecutionHistoryEntries([entry]));

    await renderLogDialog();

    await waitFor(() => {
      expect(
        screen.getByText(/MockedDTName Execution History/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    });
  });

  it('renders the LogDialog with empty execution history', async () => {
    store.dispatch(setExecutionHistoryEntries([]));

    await renderLogDialog();

    await waitFor(() => {
      expect(
        screen.getByText(/MockedDTName Execution History/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No execution history found/i),
      ).toBeInTheDocument();
    });
  });

  it('handles button click', async () => {
    store.dispatch(
      setExecutionHistoryEntries([
        {
          id: 'test-execution-2',
          dtName: assetName,
          pipelineId: 456,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [{ jobName: 'create', log: 'create log' }],
        },
      ]),
    );

    await renderLogDialog();

    const closeButton = screen.getByRole('button', { name: /Close/i });
    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(setShowLog).toHaveBeenCalled();
  });
});
