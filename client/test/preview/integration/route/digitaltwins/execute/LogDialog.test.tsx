import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LogDialog from 'preview/route/digitaltwins/execute/LogDialog';
import { Provider } from 'react-redux';
import {
  combineReducers,
  configureStore,
  getDefaultMiddleware,
} from '@reduxjs/toolkit';
import digitalTwinReducer, {
  setDigitalTwin,
  setJobLogs,
} from 'preview/store/digitalTwin.slice';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

const store = configureStore({
  reducer: combineReducers({
    digitalTwin: digitalTwinReducer,
  }),
  middleware: getDefaultMiddleware({
    serializableCheck: false,
  }),
});

describe('LogDialog', () => {
  const assetName = 'mockedDTName';
  const setShowLog = jest.fn();

  const renderLogDialog = () => {
    render(
      <Provider store={store}>
        <LogDialog name={assetName} showLog={true} setShowLog={setShowLog} />
      </Provider>,
    );
  };

  beforeEach(() => {
    store.dispatch(
      setDigitalTwin({
        assetName: 'mockedDTName',
        digitalTwin: mockDigitalTwin,
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the LogDialog with logs available', () => {
    store.dispatch(
      setJobLogs({
        assetName,
        jobLogs: [{ jobName: 'job', log: 'testLog' }],
      }),
    );

    renderLogDialog();

    expect(screen.getByText(/mockedDTName log/i)).toBeInTheDocument();
    expect(screen.getByText(/job/i)).toBeInTheDocument();
    expect(screen.getByText(/testLog/i)).toBeInTheDocument();
  });

  it('renders the LogDialog with no logs available', () => {
    store.dispatch(
      setJobLogs({
        assetName,
        jobLogs: [],
      }),
    );

    renderLogDialog();

    expect(screen.getByText(/No logs available/i)).toBeInTheDocument();
  });

  it('handles button click', async () => {
    store.dispatch(
      setJobLogs({
        assetName,
        jobLogs: [{ jobName: 'create', log: 'create log' }],
      }),
    );

    renderLogDialog();

    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    expect(setShowLog).toHaveBeenCalled();
  });
});
