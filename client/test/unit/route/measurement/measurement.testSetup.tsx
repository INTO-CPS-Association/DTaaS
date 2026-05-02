import { DEFAULT_SETTINGS, DEFAULT_MEASUREMENT } from 'store/settings.slice';
import { useSelector, useDispatch } from 'react-redux';

export const MOCK_TASKS = [
  {
    'Task Name': 'Task 1',
    Description: 'First task',
    Trials: [],
    Status: 'NOT_STARTED',
    Executions: () => [{ dtName: 'hello-world', config: {} }],
  },
  {
    'Task Name': 'Task 2',
    Description: 'Second task',
    Trials: [],
    Status: 'NOT_STARTED',
    Executions: () => [{ dtName: 'hello-world', config: {} }],
  },
];

export const MOCK_MEASUREMENT_STATE = {
  activePipelines: [],
  executionResults: [],
  isRunning: false,
  results: null,
  currentTaskIndexUI: null,
  componentSetters: null,
};

export const createResultTask = (
  name: string,
  status: string,
  avgTime?: number,
) => ({
  'Task Name': name,
  Description: `${name} description`,
  Trials: [],
  'Time Start':
    status !== 'NOT_STARTED' && status !== 'STOPPED' ? new Date() : undefined,
  'Time End':
    status !== 'NOT_STARTED' && status !== 'STOPPED' ? new Date() : undefined,
  'Average Time (s)': avgTime,
  Status: status,
});

export function setupMeasurementComponentTest() {
  const mockDispatch = jest.fn();

  jest.clearAllMocks();
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  (useSelector as unknown as jest.Mock).mockImplementation(
    (
      selector: (state: {
        settings: typeof DEFAULT_SETTINGS & typeof DEFAULT_MEASUREMENT;
        snackbar: {
          items: Array<{ id: number; message: string; severity: string }>;
          nextId: number;
        };
      }) => unknown,
    ) =>
      selector({
        settings: { ...DEFAULT_SETTINGS, ...DEFAULT_MEASUREMENT },
        snackbar: { items: [], nextId: 0 },
      }),
  );
  (useDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);

  return { mockDispatch };
}
