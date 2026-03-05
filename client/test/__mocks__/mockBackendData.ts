import { Gitlab } from '@gitbeaker/core';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import GitlabAPI from 'model/backend/gitlab/backend';

export const mockGitlabClient = new Gitlab({
  host: 'mockedHost',
  token: 'mockedToken',
  requesterFn: jest.fn(),
});

export const mockBackendAPI = {
  startPipeline: jest.fn(),
  cancelPipeline: jest.fn(),
  createRepositoryFile: jest.fn(),
  editRepositoryFile: jest.fn(),
  removeRepositoryFile: jest.fn(),
  getRepositoryFileContent: jest.fn(),
  listRepositoryFiles: jest.fn(),
  getGroupByName: jest.fn(),
  listGroupProjects: jest.fn(),
  listPipelineJobs: jest.fn(),
  getJobLog: jest.fn(),
  getPipelineStatus: jest.fn(),
  getTriggerToken: jest.fn(),
} as unknown as GitlabAPI;

export const mockBackendInstance: BackendInterface = {
  projectName: 'mockedUsername',
  api: mockBackendAPI,
  logs: [],
  init: jest.fn(),
  getProjectId: jest.fn().mockReturnValue(1),
  getCommonProjectId: jest.fn().mockReturnValue(3),
  getExecutionLogs: jest.fn(),
  getPipelineJobs: jest.fn(),
  startPipeline: jest.fn(),
  getJobTrace: jest.fn(),
  getPipelineStatus: jest.fn(),
};
