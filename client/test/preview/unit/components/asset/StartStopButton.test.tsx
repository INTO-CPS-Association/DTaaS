import { fireEvent, render, screen } from '@testing-library/react';
import StartStopButton from 'preview/components/asset/StartStopButton';
import * as React from 'react';
import { Provider } from 'react-redux';
import store from 'store/store';
import { handleButtonClick } from 'preview/route/digitaltwins/execute/pipelineHandler';
import * as redux from 'react-redux';

jest.mock('preview/route/digitaltwins/execute/pipelineHandler', () => ({
  handleButtonClick: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('StartStopButton', () => {
  const assetName = 'testAssetName';
  const setLogButtonDisabled = jest.fn();

  beforeEach(() => {
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

  it('handler button click', () => {
    const startButton = screen.getByRole('button', {
      name: /Start/i,
    });
    fireEvent.click(startButton);

    expect(handleButtonClick).toHaveBeenCalled();
  });

  it('renders the circular progress when pipelineLoading is true', () => {
    (redux.useSelector as jest.Mock).mockReturnValue({
      DTName: assetName,
      pipelineLoading: true,
    });

    render(
      <Provider store={store}>
        <StartStopButton
          assetName={assetName}
          setLogButtonDisabled={setLogButtonDisabled}
        />
      </Provider>,
    );

    expect(screen.queryByTestId('circular-progress')).toBeInTheDocument();
  });
});
