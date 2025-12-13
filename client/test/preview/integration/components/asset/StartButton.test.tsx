import {
  fireEvent,
  render,
  screen,
  act,
  waitFor,
} from '@testing-library/react';
import StartButton from 'preview/components/asset/StartButton';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import digitalTwinReducer, {
  setDigitalTwin,
  setPipelineLoading,
} from 'model/backend/state/digitalTwin.slice';
import executionHistoryReducer, {
  addExecutionHistoryEntry,
} from 'model/backend/state/executionHistory.slice';
import '@testing-library/jest-dom';
import { createMockDigitalTwinData } from 'test/preview/__mocks__/global_mocks';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { storeResetAll } from 'test/preview/integration/integration.testUtil';

jest.mock('model/backend/util/digitalTwinAdapter', () => ({
  createDigitalTwinFromData: jest.fn().mockResolvedValue({
    DTName: 'Asset 1',
    execute: jest.fn().mockResolvedValue(123),
    stop: jest.fn().mockResolvedValue(undefined),
  }),
  extractDataFromDigitalTwin: jest.fn().mockReturnValue({
    DTName: 'Asset 1',
    description: 'Test Digital Twin Description',
    jobLogs: [],
    pipelineCompleted: false,
    pipelineLoading: false,
    pipelineId: undefined,
    currentExecutionId: undefined,
    lastExecutionStatus: undefined,
    gitlabProjectId: 123,
  }),
}));

jest.mock('model/backend/util/init', () => ({
  initDigitalTwin: jest.fn().mockResolvedValue({
    DTName: 'Asset 1',
    execute: jest.fn().mockResolvedValue(123),
    stop: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('model/backend/gitlab/instance', () => ({
  GitlabInstance: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    getProjectId: jest.fn().mockResolvedValue(123),
    show: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('route/digitaltwins/execution/executionButtonHandlers', () => ({
  handleStart: jest.fn(),
}));

jest.mock('@mui/material/CircularProgress', () => ({
  __esModule: true,
  default: () => <div data-testid="circular-progress" />,
}));

const createStore = () =>
  configureStore({
    reducer: combineReducers({
      digitalTwin: digitalTwinReducer,
      executionHistory: executionHistoryReducer,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

describe('StartButton Integration Test', () => {
  let store: ReturnType<typeof createStore>;
  const assetName = 'mockedDTName';
  const setHistoryButtonDisabled = jest.fn();

  beforeEach(() => {
    store = createStore();

    storeResetAll();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  const renderComponent = () => {
    act(() => {
      render(
        <Provider store={store}>
          <StartButton
            assetName={assetName}
            setHistoryButtonDisabled={setHistoryButtonDisabled} // Updated prop name
          />
        </Provider>,
      );
    });
  };

  it('renders only the Start button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });

  it('handles button click', async () => {
    renderComponent();
    const startButton = screen.getByRole('button', { name: /Start/i });

    await act(async () => {
      fireEvent.click(startButton);
    });

    expect(startButton).toBeInTheDocument();
    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });

  it('renders the circular progress when pipelineLoading is true', async () => {
    await act(async () => {
      const digitalTwinData = createMockDigitalTwinData(assetName);
      store.dispatch(
        setDigitalTwin({
          assetName,
          digitalTwin: digitalTwinData,
        }),
      );
      store.dispatch(setPipelineLoading({ assetName, pipelineLoading: true }));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByTestId('circular-progress')).toBeInTheDocument();
    });
  });

  it('shows running execution count when there are running executions', async () => {
    await act(async () => {
      store.dispatch(
        addExecutionHistoryEntry({
          id: '1',
          dtName: assetName,
          pipelineId: 123,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        }),
      );

      store.dispatch(
        addExecutionHistoryEntry({
          id: '2',
          dtName: assetName,
          pipelineId: 456,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        }),
      );
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByTestId('circular-progress')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });
  });

  it('does not show loading indicator when there are only completed executions', async () => {
    await act(async () => {
      store.dispatch(
        addExecutionHistoryEntry({
          id: '1',
          dtName: assetName,
          pipelineId: 123,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        }),
      );
    });

    renderComponent();

    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });
});
