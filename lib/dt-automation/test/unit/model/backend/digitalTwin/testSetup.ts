import GitlabInstance from 'model/gitlab/instance';
import DigitalTwin from 'model/digitalTwin';
import { mockBackendAPI } from 'test/__mocks__/global_mocks';
import type { IExecutionHistory } from 'model/interfaces/execution';
import { setExecutionHistoryDB } from 'model/util/digitalTwinExecutionHistory';
import { setPipelineExecutionDB } from 'model/util/digitalTwinPipelineExecution';

jest.mock('model/util/digitalTwinUtils', () => ({
  ...jest.requireActual('model/util/digitalTwinUtils'),
  getUpdatedLibraryFile: jest.fn(),
}));

export const mockedIndexedDBService: jest.Mocked<IExecutionHistory> = {
  init: jest.fn(),
  add: jest.fn(),
  update: jest.fn(),
  getById: jest.fn(),
  getByDTName: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
  deleteByDTName: jest.fn(),
};

export const mockGitlabInstance = {
  api: mockBackendAPI,
  triggerToken: 'test-token',
  logs: [] as { jobName: string; log: string }[],
  setProjectIds: jest.fn(),
  getProjectId: jest.fn().mockReturnValue(1),
  getCommonProjectId: jest.fn().mockReturnValue(2),
  startPipeline: jest.fn().mockResolvedValue({ id: 123 }),
  getChildPipelineId: jest.fn(),
} as unknown as GitlabInstance;

export const files = [
  {
    name: 'fileName',
    content: 'fileContent',
    isNew: true,
    isModified: false,
  },
];

export const createDigitalTwin = (dtName: string = 'test-DTName') =>
  new DigitalTwin(dtName, mockGitlabInstance);

export const setupBeforeEach = (_dt: ReturnType<typeof createDigitalTwin>) => {
  mockGitlabInstance.getProjectId = jest.fn().mockReturnValue(1);
  mockGitlabInstance.getCommonProjectId = jest.fn().mockReturnValue(2);
  mockGitlabInstance.startPipeline = jest.fn().mockResolvedValue({ id: 123 });
  mockGitlabInstance.getChildPipelineId = jest.fn();

  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: jest.fn(() => 'testUser'),
      setItem: jest.fn(),
      clear: jest.fn(),
      removeItem: jest.fn(),
      length: 0,
      key: jest.fn(),
    },
    writable: true,
  });

  setExecutionHistoryDB(mockedIndexedDBService);
  setPipelineExecutionDB(mockedIndexedDBService);

  mockedIndexedDBService.add.mockResolvedValue('mock-id');
  mockedIndexedDBService.getByDTName.mockResolvedValue([]);
  mockedIndexedDBService.getById.mockResolvedValue(null);
  mockedIndexedDBService.update.mockResolvedValue(undefined);
};
