import type DigitalTwin from 'src/digitalTwin';
import { ExecutionStatus } from 'src/interfaces/execution';
import { DigitalTwinData } from 'src/state/digitalTwin.slice';
import { createDigitalTwinFromData } from 'src/util/digitalTwinAdapter';
import { initDigitalTwin } from 'src/util/init';

jest.mock('src/util/init', () => ({
  initDigitalTwin: jest.fn(),
}));

const digitalTwinData: DigitalTwinData = {
  DTName: 'test-twin',
  description: 'A test twin',
  fullDescription: '',
  jobLogs: [{ jobName: 'build', log: 'completed' }],
  pipelineCompleted: true,
  pipelineLoading: false,
  pipelineId: 42,
  currentExecutionId: 'execution-1',
  lastExecutionStatus: ExecutionStatus.COMPLETED,
};

function createDigitalTwin(): DigitalTwin {
  return {
    pipelineId: null,
    currentExecutionId: null,
    lastExecutionStatus: null,
    jobLogs: [],
    pipelineLoading: true,
    pipelineCompleted: false,
    description: '',
  } as unknown as DigitalTwin;
}

describe('createDigitalTwinFromData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('copies persisted state to the initialized digital twin', async () => {
    const digitalTwin = createDigitalTwin();
    (initDigitalTwin as jest.Mock).mockResolvedValue(digitalTwin);

    const result = await createDigitalTwinFromData(digitalTwinData, 'asset');

    expect(result).toBe(digitalTwin);
    expect(result).toMatchObject({
      pipelineId: 42,
      currentExecutionId: 'execution-1',
      lastExecutionStatus: ExecutionStatus.COMPLETED,
      jobLogs: digitalTwinData.jobLogs,
      pipelineCompleted: true,
      pipelineLoading: false,
      description: 'A test twin',
    });
  });

  it('leaves optional state unchanged when persisted values are absent', async () => {
    const digitalTwin = createDigitalTwin();
    digitalTwin.pipelineId = 7;
    (initDigitalTwin as jest.Mock).mockResolvedValue(digitalTwin);

    await createDigitalTwinFromData(
      { ...digitalTwinData, pipelineId: undefined },
      'asset',
    );

    expect(digitalTwin.pipelineId).toBe(7);
  });

  it('throws when initialization does not return a digital twin', async () => {
    (initDigitalTwin as jest.Mock).mockResolvedValue(undefined);

    await expect(
      createDigitalTwinFromData(digitalTwinData, 'asset'),
    ).rejects.toThrow('Failed to initialize DigitalTwin for asset: asset');
  });
});
