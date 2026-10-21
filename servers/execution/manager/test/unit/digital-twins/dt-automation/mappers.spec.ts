import { describe, expect, it } from '@jest/globals';
import {
  type DigitalTwin,
  ExecutionStatus,
} from '@into-cps-association/dt-automation';
import {
  toDigitalTwinDetails,
  toDigitalTwinSummary,
  toExecutionRecord,
} from 'src/digital-twins/dt-automation/mappers.js';

const entry = {
  id: 'e-1',
  dtName: 'hello-world',
  pipelineId: 42,
  timestamp: 1,
  status: ExecutionStatus.COMPLETED,
  jobLogs: [{ jobName: 'execute', log: 'done' }],
};

function digitalTwinWith(description: string | undefined): DigitalTwin {
  return {
    DTName: 'hello-world',
    description,
    fullDescription: '# hello-world',
    descriptionFiles: ['README.md'],
    configFiles: ['config.json'],
    lifecycleFiles: ['execute'],
  } as unknown as DigitalTwin;
}

describe('mappers', () => {
  it('copies only the fields of the execution record', () => {
    const extended = { ...entry, addedByThePackage: true };

    const record = toExecutionRecord(extended);

    expect(record).toEqual({
      id: 'e-1',
      dtName: 'hello-world',
      pipelineId: 42,
      timestamp: 1,
      status: 'completed',
      jobLogs: [{ jobName: 'execute', log: 'done' }],
    });
    expect(record.jobLogs).not.toBe(entry.jobLogs);
  });

  it.each(Object.values(ExecutionStatus))('keeps the status %s', (status) => {
    expect(toExecutionRecord({ ...entry, status }).status).toBe(status);
  });

  it('sums up a digital twin by its name and description', () => {
    const data = {
      DTName: 'hello-world',
      description: 'Says hello',
      fullDescription: '# hello-world',
      jobLogs: [],
      pipelineCompleted: false,
      pipelineLoading: false,
    };

    expect(toDigitalTwinSummary(data)).toEqual({
      name: 'hello-world',
      description: 'Says hello',
    });
  });

  it('describes a digital twin with the names of its files', () => {
    expect(toDigitalTwinDetails(digitalTwinWith('Says hello'))).toEqual({
      name: 'hello-world',
      description: 'Says hello',
      fullDescription: '# hello-world',
      descriptionFiles: ['README.md'],
      configFiles: ['config.json'],
      lifecycleFiles: ['execute'],
    });
  });

  it('gives a digital twin without a description an empty one', () => {
    const details = toDigitalTwinDetails(digitalTwinWith(undefined));

    expect(details.description).toBe('');
  });
});
