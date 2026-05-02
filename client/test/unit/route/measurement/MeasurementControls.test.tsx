import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import MeasurementControls from 'route/measurement/MeasurementControls';

describe('MeasurementControls', () => {
  const defaultControlProps = {
    isRunning: false,
    hasStarted: false,
    iterations: 3,
    completedTasks: 0,
    completedTrials: 0,
    totalTasks: 5,
    results: [],
    onStart: jest.fn(),
    onRestart: jest.fn(),
    onStop: jest.fn(),
    onPurge: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  type TrialCounterCase = [
    hasStarted: boolean,
    completedTasks: number,
    completedTrials: number,
    totalTasks: number,
    iterations: number,
    expected: string,
  ];

  const trialCounterCases: TrialCounterCase[] = [
    [false, 0, 0, 5, 3, '0/15'],
    [true, 2, 6, 5, 3, '6/15'],
    [true, 5, 15, 5, 3, '15/15'],
    [true, 0, 0, 3, 3, '0/9'],
    [true, 0, 1, 5, 3, '1/15'],
  ];

  it.each(trialCounterCases)(
    'shows trial counter (hasStarted=%s, completedTasks=%s, completedTrials=%s, total=%s, iter=%s) as %s',
    (
      hasStarted,
      completedTasks,
      completedTrials,
      totalTasks,
      iterations,
      expected,
    ) => {
      render(
        <MeasurementControls
          {...defaultControlProps}
          hasStarted={hasStarted}
          completedTasks={completedTasks}
          completedTrials={completedTrials}
          totalTasks={totalTasks}
          iterations={iterations}
        />,
      );
      expect(
        screen.getByText(`Trials Completed: ${expected}`),
      ).toBeInTheDocument();
    },
  );

  it('shows Start button when not running and not stopped', () => {
    render(<MeasurementControls {...defaultControlProps} />);
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('shows Stop button when running', () => {
    render(<MeasurementControls {...defaultControlProps} isRunning={true} />);
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  it('disables Start button when measurement has started', () => {
    render(<MeasurementControls {...defaultControlProps} hasStarted={true} />);
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('calls onStart when Start button is clicked', () => {
    const onStart = jest.fn();
    render(<MeasurementControls {...defaultControlProps} onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalled();
  });

  type ConfirmDialogCase = [
    buttonName: string,
    propKey: string,
    dialogTitle: string,
    dialogText: RegExp,
    handlerKey: string,
  ];

  const confirmDialogCases: ConfirmDialogCase[] = [
    [
      'Stop',
      'isRunning',
      'Stop Measurement?',
      /Are you sure you want to stop the measurement/,
      'onStop',
    ],
    [
      'Purge',
      'none',
      'Purge Measurement Data?',
      /Are you sure you want to purge all measurement data/,
      'onPurge',
    ],
  ];

  it.each(confirmDialogCases)(
    'shows %s confirmation dialog and calls handler on confirm',
    (buttonName, propKey, dialogTitle, dialogText, handlerKey) => {
      const handler = jest.fn();
      const props = {
        ...defaultControlProps,
        [handlerKey]: handler,
        ...(propKey === 'none' ? {} : { [propKey]: true }),
      };
      render(<MeasurementControls {...props} />);

      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      expect(screen.getByText(dialogTitle)).toBeInTheDocument();
      expect(screen.getByText(dialogText)).toBeInTheDocument();

      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: buttonName }));
      expect(handler).toHaveBeenCalled();
    },
  );

  type CancelDialogCase = [
    buttonName: string,
    propKey: string,
    handlerKey: string,
  ];

  const cancelDialogCases: CancelDialogCase[] = [
    ['Stop', 'isRunning', 'onStop'],
    ['Purge', 'none', 'onPurge'],
  ];

  it.each(cancelDialogCases)(
    'does not call %s handler when dialog is cancelled',
    (buttonName, propKey, handlerKey) => {
      const handler = jest.fn();
      const props = {
        ...defaultControlProps,
        [handlerKey]: handler,
        ...(propKey === 'none' ? {} : { [propKey]: true }),
      };
      render(<MeasurementControls {...props} />);

      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(handler).not.toHaveBeenCalled();
    },
  );

  it('calls onRestart directly when Restart button is clicked', () => {
    const onRestart = jest.fn();
    render(
      <MeasurementControls
        {...defaultControlProps}
        hasStarted={true}
        onRestart={onRestart}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(onRestart).toHaveBeenCalled();
  });

  it('disables Restart button when not started or when running', () => {
    const { rerender } = render(
      <MeasurementControls {...defaultControlProps} hasStarted={false} />,
    );
    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();

    rerender(
      <MeasurementControls
        {...defaultControlProps}
        hasStarted={true}
        isRunning={true}
      />,
    );
    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
  });

  it('disables Purge button when running', () => {
    render(<MeasurementControls {...defaultControlProps} isRunning={true} />);
    expect(screen.getByRole('button', { name: 'Purge' })).toBeDisabled();
  });

  it('disables Start button when all tasks are complete', () => {
    render(
      <MeasurementControls
        {...defaultControlProps}
        completedTasks={5}
        totalTasks={5}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('enables Start button when not all tasks are complete', () => {
    render(
      <MeasurementControls
        {...defaultControlProps}
        completedTasks={3}
        totalTasks={5}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
  });
});
