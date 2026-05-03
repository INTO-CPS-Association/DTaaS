import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDispatch, useSelector } from 'react-redux';
import CustomSnackbar from 'components/route/Snackbar';
import { hideSnackbar } from 'store/snackbar.slice';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('store/snackbar.slice', () => ({
  hideSnackbar: jest.fn((id: number) => ({
    type: 'snackbar/hideSnackbar',
    payload: id,
  })),
}));

const mockSnackbarCalls: Array<{
  open: boolean;
  autoHideDuration?: number;
  onClose?: (event: React.SyntheticEvent | Event, reason?: string) => void;
}> = [];

jest.mock('@mui/material/Snackbar', () => {
  const MockSnackbar = (props: {
    children: React.ReactNode;
    onClose?: (event: React.SyntheticEvent | Event, reason?: string) => void;
    open: boolean;
    autoHideDuration?: number;
  }) => {
    mockSnackbarCalls.push({
      open: props.open,
      autoHideDuration: props.autoHideDuration,
      onClose: props.onClose,
    });
    if (!props.open) return null;
    return (
      <div data-testid="mock-snackbar">
        {props.children}
        <button
          data-testid="trigger-clickaway"
          onClick={(e) => props.onClose?.(e, 'clickaway')}
        >
          Clickaway
        </button>
        <button
          data-testid="trigger-timeout"
          onClick={(e) => props.onClose?.(e, 'timeout')}
        >
          Timeout
        </button>
        <button
          data-testid="trigger-escapeKeyDown"
          onClick={(e) => props.onClose?.(e, 'escapeKeyDown')}
        >
          Escape
        </button>
      </div>
    );
  };
  return {
    __esModule: true,
    default: MockSnackbar,
  };
});

jest.mock('@mui/material/Alert', () => {
  const MockAlert = (props: {
    children: React.ReactNode;
    onClose?: () => void;
    severity?: string;
  }) => (
    <div
      role="alert"
      data-testid="mock-alert"
      data-severity={props.severity}
      className={`MuiAlert-standard${props.severity ? props.severity.charAt(0).toUpperCase() + props.severity.slice(1) : 'Success'}`}
    >
      {props.children}
      {props.onClose && (
        <button aria-label="close" onClick={props.onClose}>
          Close
        </button>
      )}
    </div>
  );
  return {
    __esModule: true,
    default: MockAlert,
  };
});

describe('CustomSnackbar', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSnackbarCalls.length = 0;
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );
  });

  const renderSnackbar = (
    items: Array<{ id: number; message: string; severity: string }> = [
      { id: 0, message: 'Test message', severity: 'success' },
    ],
  ) => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue(
      items,
    );
    return render(<CustomSnackbar />);
  };

  it('renders the Snackbar with the correct message', () => {
    renderSnackbar([
      { id: 0, message: 'Custom test message', severity: 'success' },
    ]);
    expect(screen.getByText('Custom test message')).toBeInTheDocument();
  });

  it('renders the Alert with correct severity', () => {
    renderSnackbar([{ id: 0, message: 'Test', severity: 'error' }]);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-standardError');
  });

  it('does not render when items array is empty', () => {
    renderSnackbar([]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not dispatch hideSnackbar on clickaway', () => {
    renderSnackbar();

    mockDispatch.mockClear();

    const clickawayButton = screen.getByTestId('trigger-clickaway');
    fireEvent.click(clickawayButton);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches hideSnackbar with id on timeout', () => {
    renderSnackbar([{ id: 5, message: 'Test', severity: 'success' }]);

    mockDispatch.mockClear();

    const timeoutButton = screen.getByTestId('trigger-timeout');
    fireEvent.click(timeoutButton);

    expect(mockDispatch).toHaveBeenCalledWith(hideSnackbar(5));
  });

  it('dispatches hideSnackbar with id on escape key down', () => {
    renderSnackbar([{ id: 7, message: 'Test', severity: 'success' }]);

    mockDispatch.mockClear();

    const escapeButton = screen.getByTestId('trigger-escapeKeyDown');
    fireEvent.click(escapeButton);

    expect(mockDispatch).toHaveBeenCalledWith(hideSnackbar(7));
  });

  it('dispatches hideSnackbar when close button is clicked', () => {
    renderSnackbar([{ id: 3, message: 'Test', severity: 'success' }]);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockDispatch).toHaveBeenCalledWith(hideSnackbar(3));
  });

  it('uses correct selector to get snackbar items', () => {
    const mockItems = [
      { id: 0, message: 'Selector test', severity: 'warning' as const },
    ];
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue(
      mockItems,
    );

    render(<CustomSnackbar />);

    expect(useSelector).toHaveBeenCalledWith(expect.any(Function));

    const selectorFn = (useSelector as jest.MockedFunction<typeof useSelector>)
      .mock.calls[0][0];
    const result = selectorFn({ snackbar: { items: mockItems, nextId: 1 } });
    expect(result).toEqual(mockItems);
  });

  it('renders with different severity levels', () => {
    const severities = ['success', 'error', 'warning', 'info'] as const;

    severities.forEach((severity) => {
      const { unmount } = renderSnackbar([
        { id: 0, message: 'Test', severity },
      ]);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass(
        `MuiAlert-standard${severity.charAt(0).toUpperCase() + severity.slice(1)}`,
      );
      unmount();
    });
  });

  it('does not pass autoHideDuration to Snackbar (managed via useEffect)', () => {
    renderSnackbar();

    expect(mockSnackbarCalls.length).toBeGreaterThan(0);
    expect(mockSnackbarCalls[0].autoHideDuration).toBeUndefined();
  });

  it('renders multiple snackbars when items has multiple entries', () => {
    renderSnackbar([
      { id: 0, message: 'First', severity: 'success' },
      { id: 1, message: 'Second', severity: 'error' },
      { id: 2, message: 'Third', severity: 'warning' },
    ]);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(3);
  });
});
