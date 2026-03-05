import { screen, render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HistoryButton, {
  handleToggleHistory,
} from 'components/asset/HistoryButton';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import * as redux from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockReturnValue([]),
}));

describe('HistoryButton', () => {
  const assetName = 'test-asset';
  const useSelector = redux.useSelector as unknown as jest.Mock;

  beforeEach(() => {
    useSelector.mockReturnValue([]);
  });

  const renderHistoryButton = (
    setShowLog: jest.Mock = jest.fn(),
    historyButtonDisabled = false,
    testAssetName = assetName,
  ) =>
    render(
      <HistoryButton
        setShowLog={setShowLog}
        historyButtonDisabled={historyButtonDisabled}
        assetName={testAssetName}
      />,
    );

  it('renders the History button', () => {
    renderHistoryButton();
    expect(
      screen.getByRole('button', { name: /History/i }),
    ).toBeInTheDocument();
  });

  it('handles button click when enabled', () => {
    const setShowLog = jest.fn((callback) => callback(false));
    renderHistoryButton(setShowLog);

    const historyButton = screen.getByRole('button', { name: /History/i });
    fireEvent.click(historyButton);

    expect(setShowLog).toHaveBeenCalled();
  });

  it('does not handle button click when disabled and no executions', () => {
    renderHistoryButton(jest.fn(), true);

    const historyButton = screen.getByRole('button', { name: /History/i });
    expect(historyButton).toBeDisabled();
  });

  it('toggles setShowLog value correctly', () => {
    let toggleValue = false;
    const mockSetShowLog = jest.fn((callback) => {
      toggleValue = callback(toggleValue);
    });

    renderHistoryButton(mockSetShowLog);

    const historyButton = screen.getByRole('button', { name: /History/i });

    fireEvent.click(historyButton);
    expect(toggleValue).toBe(true);

    fireEvent.click(historyButton);
    expect(toggleValue).toBe(false);
  });

  it('shows badge with execution count when executions exist', () => {
    const mockExecutions = [
      { id: '1', dtName: assetName, status: ExecutionStatus.COMPLETED },
      { id: '2', dtName: assetName, status: ExecutionStatus.RUNNING },
    ];

    useSelector.mockReturnValue(mockExecutions);

    renderHistoryButton();

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('enables button when historyButtonDisabled is true but executions exist', () => {
    const mockExecutions = [
      { id: '1', dtName: assetName, status: ExecutionStatus.COMPLETED },
    ];

    useSelector.mockReturnValue(mockExecutions);

    renderHistoryButton(jest.fn(), true);

    const historyButton = screen.getByRole('button', { name: /History/i });
    expect(historyButton).toBeEnabled();
  });

  it('tests handleToggleHistory function directly', () => {
    let showLog = false;
    const setShowLog = jest.fn((callback) => {
      showLog = callback(showLog);
    });

    handleToggleHistory(setShowLog);
    expect(showLog).toBe(true);

    handleToggleHistory(setShowLog);
    expect(showLog).toBe(false);
  });
});
