import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ExecutionCard,
  TrialCard,
} from 'route/measurement/MeasurementComponents';
import {
  createMockExecution,
  createMockTrial,
} from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';

jest.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; to: string }) => (
    <a {...props}>{children}</a>
  ),
}));

jest.mock('model/backend/gitlab/measure/measurement.utils', () => {
  const actual = jest.requireActual(
    'model/backend/gitlab/measure/measurement.utils',
  );
  return {
    ...actual,
    secondsDifference: jest.fn((start?: Date, end?: Date) => {
      if (!start || !end) return undefined;
      return (end.getTime() - start.getTime()) / 1000;
    }),
  };
});

const mockUtils = jest.requireMock(
  'model/backend/gitlab/measure/measurement.utils',
);
const mockSecondsDifference = mockUtils.secondsDifference as jest.Mock;

describe('MeasurementTrialCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ExecutionCard', () => {
    it('renders execution details correctly', () => {
      const execution = createMockExecution({
        dtName: 'test-dt',
        pipelineId: 456,
        status: 'success',
      });
      render(<ExecutionCard execution={execution} />);
      expect(screen.getByText(/test-dt/)).toBeInTheDocument();
      expect(screen.getByText(/Pipeline: 456/)).toBeInTheDocument();
      expect(screen.getByText('success')).toBeInTheDocument();
      expect(screen.getByText(/Runner: linux/)).toBeInTheDocument();
    });

    it('renders execution without pipeline ID', () => {
      const execution = createMockExecution({
        dtName: 'test-dt',
        pipelineId: null,
        status: 'running',
      });
      render(<ExecutionCard execution={execution} />);
      expect(screen.getByText('test-dt')).toBeInTheDocument();
      expect(screen.queryByText(/Pipeline:/)).not.toBeInTheDocument();
    });
  });

  describe('TrialCard', () => {
    it('renders trial number and time correctly', () => {
      mockSecondsDifference.mockReturnValue(10);
      const trial = createMockTrial({
        'Time Start': new Date('2026-01-01T10:00:00.000Z'),
        'Time End': new Date('2026-01-01T10:00:10.000Z'),
      });
      render(<TrialCard trial={trial} trialIndex={0} />);
      expect(screen.getByText('Trial 1')).toBeInTheDocument();
      expect(screen.getByText('10.0s')).toBeInTheDocument();
      mockSecondsDifference.mockRestore();
    });

    it('renders dash when times are not available', () => {
      const trial = createMockTrial({
        'Time Start': undefined,
        'Time End': undefined,
      });
      render(<TrialCard trial={trial} trialIndex={0} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows stopped indicator when trial is stopped', () => {
      const trial = createMockTrial({ Status: 'STOPPED' });
      render(<TrialCard trial={trial} trialIndex={0} />);
      expect(screen.getByText('(stopped)')).toBeInTheDocument();
    });

    it('renders execution cards for each execution', () => {
      const trial = createMockTrial({
        Execution: [
          createMockExecution({ dtName: 'dt-1', pipelineId: 1 }),
          createMockExecution({ dtName: 'dt-2', pipelineId: 2 }),
        ],
      });
      render(<TrialCard trial={trial} trialIndex={0} />);
      expect(screen.getByText(/dt-1/)).toBeInTheDocument();
      expect(screen.getByText(/dt-2/)).toBeInTheDocument();
    });
  });
});
