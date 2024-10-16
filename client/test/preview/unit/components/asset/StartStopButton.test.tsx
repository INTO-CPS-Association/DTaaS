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

const renderStartStopButton = (
  assetName: string,
  setLogButtonDisabled: jest.Mock,
) =>
  render(
    <Provider store={store}>
      <StartStopButton
        assetName={assetName}
        setLogButtonDisabled={setLogButtonDisabled}
      />
    </Provider>,
  );

describe('StartStopButton', () => {
  const assetName = 'testAssetName';
  const setLogButtonDisabled = jest.fn();

  beforeEach(() => {
    renderStartStopButton(assetName, setLogButtonDisabled);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders only the Start button', () => {
    expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });

  it('handles button click', () => {
    const startButton = screen.getByRole('button', {
      name: /Start/i,
    });
    fireEvent.click(startButton);

    expect(handleButtonClick).toHaveBeenCalled();
  });

  it('renders the circular progress when pipelineLoading is true', () => {
    (
      redux.useSelector as jest.MockedFunction<typeof redux.useSelector>
    ).mockReturnValue({
      DTName: assetName,
      pipelineLoading: true,
    });

    renderStartStopButton(assetName, setLogButtonDisabled);

    expect(screen.queryByTestId('circular-progress')).toBeInTheDocument();
  });
});
