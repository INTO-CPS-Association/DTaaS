import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import StartStopButton from 'preview/components/asset/StartStopButton';
import { configureStore } from '@reduxjs/toolkit';
import digitalTwinReducer from 'store/digitalTwin.slice';
import snackbarReducer from 'store/snackbar.slice';
import * as React from 'react';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

const store = configureStore({
  reducer: {
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarReducer,
  },
});

describe('StartStopButton Integration Test', () => {
  beforeEach(() => {
    store.dispatch({
      type: 'digitalTwin/setDigitalTwin',
      payload: {
        assetName: 'testAsset',
        digitalTwin: mockDigitalTwin,
      },
    });
  });

  it('changes button text on click and handles pipeline logic', async () => {
    render(
      <Provider store={store}>
        <StartStopButton assetName="testAsset" setLogButtonDisabled={jest.fn()} />
      </Provider>
    );

    const button = screen.getByText('Start');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText('Stop')).toBeInTheDocument());
  });
});
