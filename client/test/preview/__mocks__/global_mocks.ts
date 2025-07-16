import DigitalTwin from 'preview/util/digitalTwin';
import FileHandler from 'preview/util/fileHandler';
import DTAssets from 'preview/util/DTAssets';
import LibraryManager from 'preview/util/libraryManager';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';

export const mockFileHandler: FileHandler = {
  name: 'mockedName',
  backend: mockBackendInstance,
  createFile: jest.fn(),
  updateFile: jest.fn(),
  deleteDT: jest.fn(),
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
  getLibraryFileNames: jest.fn(),
  getLibraryConfigFileNames: jest.fn(),
  getFolders: jest.fn(),
};

export const mockDTAssets: DTAssets = {
  DTName: 'mockedDTName',
  backend: mockBackendInstance,
  fileHandler: mockFileHandler,
  createFiles: jest.fn(),
  getFilesFromAsset: jest.fn(),
  updateFileContent: jest.fn(),
  updateLibraryFileContent: jest.fn(),
  appendTriggerToPipeline: jest.fn(),
  removeTriggerFromPipeline: jest.fn(),
  delete: jest.fn(),
  getFileContent: jest.fn(),
  getLibraryFileContent: jest.fn(),
  getFileNames: jest.fn(),
  getLibraryConfigFileNames: jest.fn(),
  getFolders: jest.fn(),
};

export const mockLibraryManager: LibraryManager = {
  assetName: 'mockedAssetName',
  backend: mockBackendInstance,
  fileHandler: mockFileHandler,
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
};

export const mockDigitalTwin: DigitalTwin = {
  DTName: 'mockedDTName',
  description: 'mockedDescription',
  fullDescription: 'mockedFullDescription',
  backend: mockBackendInstance,
  DTAssets: mockDTAssets,
  pipelineId: 1,
  lastExecutionStatus: 'mockedStatus',
  jobLogs: [{ jobName: 'job1', log: 'log1' }],
  pipelineLoading: false,
  pipelineCompleted: false,
  descriptionFiles: ['descriptionFile'],
  configFiles: ['configFile'],
  lifecycleFiles: ['lifecycleFile'],
  assetFiles: [
    { assetPath: 'assetPath', fileNames: ['assetFileName1', 'assetFileName2'] },
  ],
  getDescription: jest.fn(),
  getFullDescription: jest.fn(),
  triggerPipeline: jest.fn(),
  execute: jest.fn(),
  stop: jest.fn(),
  create: jest.fn().mockResolvedValue('Success'),
  delete: jest.fn(),
  getDescriptionFiles: jest.fn().mockResolvedValue(['descriptionFile']),
  getLifecycleFiles: jest.fn().mockResolvedValue(['lifecycleFile']),
  getConfigFiles: jest.fn().mockResolvedValue(['configFile']),
  prepareAllAssetFiles: jest.fn(),
  getAssetFiles: jest.fn(),
} as unknown as DigitalTwin;

export const mockLibraryAsset = {
  name: 'Asset 1',
  path: 'path',
  type: 'Digital Twins',
  isPrivate: true,
  backend: mockBackendInstance,
  description: 'description',
  fullDescription: 'fullDescription',
  libraryManager: mockLibraryManager,
  configFiles: [],

  getDescription: jest.fn(),
  getFullDescription: jest.fn(),
  getConfigFiles: jest.fn(),
};
