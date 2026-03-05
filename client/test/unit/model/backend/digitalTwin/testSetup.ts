import GitlabInstance from 'model/backend/gitlab/instance';
import DigitalTwin from 'model/backend/digitalTwin';
import { mockBackendAPI } from 'test/__mocks__/global_mocks';
import indexedDBService from 'database/executionHistoryDB';

jest.mock('database/executionHistoryDB');

jest.mock('model/backend/util/digitalTwinUtils', () => ({
  ...jest.requireActual('model/backend/util/digitalTwinUtils'),
  getUpdatedLibraryFile: jest.fn(),
}));

export const mockedIndexedDBService = indexedDBService as jest.Mocked<
  typeof indexedDBService
> & {
  addExecutionHistory: jest.Mock;
  getExecutionHistoryByDTName: jest.Mock;
  getExecutionHistoryById: jest.Mock;
  updateExecutionHistory: jest.Mock;
};

export const mockGitlabInstance = {
  api: mockBackendAPI,
  triggerToken: 'test-token',
  logs: [] as { jobName: string; log: string }[],
  setProjectIds: jest.fn(),
  getProjectId: jest.fn().mockReturnValue(1),
  getCommonProjectId: jest.fn().mockReturnValue(2),
  startPipeline: jest.fn().mockResolvedValue({ id: 123 }),
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

  mockedIndexedDBService.add.mockResolvedValue('mock-id');
  mockedIndexedDBService.getByDTName.mockResolvedValue([]);
  mockedIndexedDBService.getById.mockResolvedValue(null);
  mockedIndexedDBService.update.mockResolvedValue(undefined);
};
