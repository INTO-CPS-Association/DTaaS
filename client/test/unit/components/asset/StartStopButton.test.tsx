import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StartStopButton from 'components/asset/StartStopButton';
import { handleButtonClick } from 'route/digitaltwins/pipelineHandler';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'store/store';
import '@testing-library/jest-dom';

jest.mock('route/digitaltwins/pipelineHandler', () => ({
  handleButtonClick: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockSetSnackbarOpen = jest.fn();
const mockSetSnackbarMessage = jest.fn();
const mockSetSnackbarSeverity = jest.fn();
const mockSetLogButtonDisabled = jest.fn();
const mockDispatch = jest.fn();
const mockHandleButtonClick = handleButtonClick as jest.MockedFunction<
  typeof handleButtonClick
>;

describe('StartStopButton', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        digitalTwin: {
          testAsset: { DTName: 'Test Digital Twin', pipelineLoading: false },
        },
      } as unknown as RootState),
    );
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders with start button text initially', () => {
    render(
      <StartStopButton
        assetName="testAsset"
        setSnackbarOpen={mockSetSnackbarOpen}
        setSnackbarMessage={mockSetSnackbarMessage}
        setSnackbarSeverity={mockSetSnackbarSeverity}
        setLogButtonDisabled={mockSetLogButtonDisabled}
      />,
    );

    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  test('renders circular progress when pipelineLoading is true', () => {
    (useSelector as jest.Mock).mockImplementationOnce((selector) =>
      selector({
        digitalTwin: {
          testAsset: { DTName: 'Test Digital Twin', pipelineLoading: true },
        },
      } as unknown as RootState),
    );

    render(
      <StartStopButton
        assetName="testAsset"
        setSnackbarOpen={mockSetSnackbarOpen}
        setSnackbarMessage={mockSetSnackbarMessage}
        setSnackbarSeverity={mockSetSnackbarSeverity}
        setLogButtonDisabled={mockSetLogButtonDisabled}
      />,
    );

    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  test('does not render circular progress when pipelineLoading is false', () => {
    render(
      <StartStopButton
        assetName="testAsset"
        setSnackbarOpen={mockSetSnackbarOpen}
        setSnackbarMessage={mockSetSnackbarMessage}
        setSnackbarSeverity={mockSetSnackbarSeverity}
        setLogButtonDisabled={mockSetLogButtonDisabled}
      />,
    );

    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  test('calls handleButtonClick with correct arguments when button is clicked', () => {
    render(
      <StartStopButton
        assetName="testAsset"
        setSnackbarOpen={mockSetSnackbarOpen}
        setSnackbarMessage={mockSetSnackbarMessage}
        setSnackbarSeverity={mockSetSnackbarSeverity}
        setLogButtonDisabled={mockSetLogButtonDisabled}
      />,
    );

    fireEvent.click(screen.getByText('Start'));

    expect(mockHandleButtonClick).toHaveBeenCalledTimes(1);
    expect(mockHandleButtonClick).toHaveBeenCalledWith(
      'Start',
      expect.any(Function),
      { DTName: 'Test Digital Twin', pipelineLoading: false },
      mockSetSnackbarMessage,
      mockSetSnackbarSeverity,
      mockSetSnackbarOpen,
      mockSetLogButtonDisabled,
      mockDispatch,
    );
  });

  test('updates snackbar message and severity on execution status change', async () => {
    mockHandleButtonClick.mockImplementationOnce(
      (
        buttonText,
        setButtonText,
        digitalTwin,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
      ) => {
        setSnackbarMessage('Execution started successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      },
    );

    render(
      <StartStopButton
        assetName="testAsset"
        setSnackbarOpen={mockSetSnackbarOpen}
        setSnackbarMessage={mockSetSnackbarMessage}
        setSnackbarSeverity={mockSetSnackbarSeverity}
        setLogButtonDisabled={mockSetLogButtonDisabled}
      />,
    );

    fireEvent.click(screen.getByText('Start'));

    await waitFor(() => {
      expect(mockSetSnackbarMessage).toHaveBeenCalledWith(
        'Execution started successfully',
      );
      expect(mockSetSnackbarSeverity).toHaveBeenCalledWith('success');
      expect(mockSetSnackbarOpen).toHaveBeenCalledWith(true);
    });
  });

  test('updates snackbar message and severity on execution status change to error', async () => {
    mockHandleButtonClick.mockImplementationOnce(
      (
        buttonText,
        setButtonText,
        digitalTwin,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
      ) => {
        setSnackbarMessage('Execution failed');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      },
    );

    render(
      <StartStopButton
        assetName="testAsset"
        setSnackbarOpen={mockSetSnackbarOpen}
        setSnackbarMessage={mockSetSnackbarMessage}
        setSnackbarSeverity={mockSetSnackbarSeverity}
        setLogButtonDisabled={mockSetLogButtonDisabled}
      />,
    );

    fireEvent.click(screen.getByText('Start'));

    await waitFor(() => {
      expect(mockSetSnackbarMessage).toHaveBeenCalledWith('Execution failed');
      expect(mockSetSnackbarSeverity).toHaveBeenCalledWith('error');
      expect(mockSetSnackbarOpen).toHaveBeenCalledWith(true);
    });
  });
});
