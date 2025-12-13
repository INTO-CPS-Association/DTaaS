import { screen, render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HistoryButton from 'components/asset/HistoryButton';
import * as redux from 'react-redux';
import { ExecutionStatus } from 'model/backend/interfaces/execution';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockReturnValue([]),
}));

describe('LogButton', () => {
  const assetName = 'test-asset';
  const useSelector = redux.useSelector as unknown as jest.Mock;

  beforeEach(() => {
    useSelector.mockReturnValue([]);
  });

  const renderLogButton = (
    setShowLog: jest.Mock = jest.fn(),
    logButtonDisabled = false,
    testAssetName = assetName,
  ) =>
    render(
      <HistoryButton
        setShowLog={setShowLog}
        historyButtonDisabled={logButtonDisabled}
        assetName={testAssetName}
      />,
    );

  it('renders the History button', () => {
    renderLogButton();
    expect(
      screen.getByRole('button', { name: /History/i }),
    ).toBeInTheDocument();
  });

  it('handles button click when enabled', () => {
    const setShowLog = jest.fn((callback) => callback(false));
    renderLogButton(setShowLog);

    const logButton = screen.getByRole('button', { name: /History/i });
    fireEvent.click(logButton);

    expect(setShowLog).toHaveBeenCalled();
  });

  it('does not handle button click when disabled and no executions', () => {
    renderLogButton(jest.fn(), true);

    const logButton = screen.getByRole('button', { name: /History/i });
    expect(logButton).toBeDisabled();
  });

  it('toggles setShowLog value correctly', () => {
    let toggleValue = false;
    const mockSetShowLog = jest.fn((callback) => {
      toggleValue = callback(toggleValue);
    });

    renderLogButton(mockSetShowLog);

    const logButton = screen.getByRole('button', { name: /History/i });

    fireEvent.click(logButton);
    expect(toggleValue).toBe(true);

    fireEvent.click(logButton);
    expect(toggleValue).toBe(false);
  });

  it('shows badge with execution count when executions exist', () => {
    const mockExecutions = [
      { id: '1', dtName: assetName, status: ExecutionStatus.COMPLETED },
      { id: '2', dtName: assetName, status: ExecutionStatus.RUNNING },
    ];

    useSelector.mockReturnValue(mockExecutions);

    renderLogButton();

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('enables button when logButtonDisabled is true but executions exist', () => {
    const mockExecutions = [
      { id: '1', dtName: assetName, status: ExecutionStatus.COMPLETED },
    ];

    useSelector.mockReturnValue(mockExecutions);

    renderLogButton(jest.fn(), true);

    const logButton = screen.getByRole('button', { name: /History/i });
    expect(logButton).toBeEnabled();
  });

  it('filters executions by assetName', () => {
    // Setup mock data for filtered executions
    const mockExecutions = [
      { id: '1', dtName: assetName, status: ExecutionStatus.COMPLETED },
      { id: '3', dtName: assetName, status: ExecutionStatus.RUNNING },
    ];

    useSelector.mockReturnValue(mockExecutions);

    renderLogButton();

    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
