import {
  fireEvent,
  render,
  screen,
  act,
  waitFor,
} from '@testing-library/react';
import StartStopButton from 'preview/components/asset/StartStopButton';
import * as React from 'react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import digitalTwinReducer, {
  setDigitalTwin,
  setPipelineLoading,
} from 'preview/store/digitalTwin.slice';
import { handleButtonClick } from 'preview/route/digitaltwins/execute/pipelineHandler';
import '@testing-library/jest-dom';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

jest.mock('preview/route/digitaltwins/execute/pipelineHandler', () => ({
  handleButtonClick: jest.fn(),
}));

jest.mock('@mui/material/CircularProgress', () => ({
  __esModule: true,
  default: () => <div data-testid="circular-progress" />,
}));

const createStore = () =>
  configureStore({
    reducer: combineReducers({
      digitalTwin: digitalTwinReducer,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

describe('StartStopButton Integration Test', () => {
  let store: ReturnType<typeof createStore>;
  const assetName = 'mockedDTName';
  const setLogButtonDisabled = jest.fn();

  beforeEach(() => {
    store = createStore();
    render(
      <Provider store={store}>
        <StartStopButton
          assetName={assetName}
          setLogButtonDisabled={setLogButtonDisabled}
        />
      </Provider>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders only the Start button', () => {
    expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });

  it('handles button click', async () => {
    const startButton = screen.getByRole('button', { name: /Start/i });

    await act(async () => {
      fireEvent.click(startButton);
    });

    expect(handleButtonClick).toHaveBeenCalled();
    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });

  it('renders the circular progress when pipelineLoading is true', async () => {
    await act(async () => {
      store.dispatch(
        setDigitalTwin({
          assetName: 'mockedDTName',
          digitalTwin: mockDigitalTwin,
        }),
      );
      store.dispatch(setPipelineLoading({ assetName, pipelineLoading: true }));
    });

    const startButton = screen.getByRole('button', { name: /Start/i });

    await act(async () => {
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('circular-progress')).toBeInTheDocument();
    });
  });
});
