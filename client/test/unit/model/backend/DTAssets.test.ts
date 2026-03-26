import { FileType } from 'model/backend/interfaces/sharedInterfaces';
import DTAssets, { getFilePath } from 'model/backend/DTAssets';
import {
  mockBackendInstance,
  mockFileHandler,
} from 'test/__mocks__/global_mocks';

jest.mock('model/backend/fileHandler', () => ({
  default: jest.fn().mockImplementation(() => mockFileHandler),
}));

describe('DTAssets', () => {
  let dtAssets: DTAssets;
  const dtName = 'DTName';
  const filePath = '.gitlab-ci.yml';
  const triggerKey = `trigger_${dtName}`;
  const triggerContent = `
    ${triggerKey}:
      stage: triggers
      trigger:
        include: digital_twins/${dtName}/.gitlab-ci.yml
      rules:
        - if: '$DTName == "${dtName}"'
          when: always
      variables:
        RunnerTag: $RunnerTag
    `;
  const fileName = 'file.md';
  const fileContent = 'updated content';
  const expectedFilePath = `digital_twins/${dtName}/${fileName}`;
  const commitMessage = `Update ${fileName} content`;

  beforeEach(() => {
    dtAssets = new DTAssets('DTName', mockBackendInstance);
    dtAssets.fileHandler = mockFileHandler;
  });

  it('should return lifecycleFolderPath when file type is LIFECYCLE', () => {
    const file = {
      name: 'test-file',
      type: FileType.LIFECYCLE,
      content: 'content',
      isNew: true,
      isModified: false,
    };
    const mainFolderPath = 'path/to/main';
    const lifecycleFolderPath = 'path/to/lifecycle';

    const result = getFilePath(file, mainFolderPath, lifecycleFolderPath);

    expect(result).toBe(lifecycleFolderPath);
  });

  it('should return mainFolderPath when file type is not LIFECYCLE', () => {
    const file = {
      name: 'test-file',
      type: FileType.CONFIGURATION,
      content: 'content',
      isNew: true,
      isModified: false,
    };
    const mainFolderPath = 'path/to/main';
    const lifecycleFolderPath = 'path/to/lifecycle';

    const result = getFilePath(file, mainFolderPath, lifecycleFolderPath);

    expect(result).toBe(mainFolderPath);
  });

  it('should create a file', async () => {
    const fileState = [
      {
        name: 'file',
        content: 'content',
        isNew: true,
        isModified: false,
        type: FileType.CONFIGURATION,
      },
      {
        name: 'file2',
        content: 'content2',
        isNew: true,
        isModified: false,
        type: FileType.LIFECYCLE,
      },
    ];
    const mainFolderPath = 'path/to/main';
    const lifecycleFolderPath = 'path/to/lifecycle';

    await dtAssets.createFiles(fileState, mainFolderPath, lifecycleFolderPath);

    expect(dtAssets.fileHandler.createFile).toHaveBeenCalledWith(
      fileState[0],
      mainFolderPath,
      'Add file to configuration folder',
    );

    expect(dtAssets.fileHandler.createFile).toHaveBeenCalledWith(
      fileState[1],
      lifecycleFolderPath,
      'Add file2 to lifecycle folder',
    );
  });

  it('should create a file from common library', async () => {
    const fileState = [
      {
        name: 'common-config-file1',
        content: 'content1',
        isNew: true,
        isModified: false,
        type: FileType.CONFIGURATION,
        isFromCommonLibrary: true,
      },
      {
        name: 'common-lifecycle-file2',
        content: 'content2',
        isNew: true,
        isModified: false,
        type: FileType.LIFECYCLE,
        isFromCommonLibrary: true,
      },
    ];

    const mainFolderPath = 'path/to/main';
    const lifecycleFolderPath = 'path/to/lifecycle';

    await dtAssets.createFiles(fileState, mainFolderPath, lifecycleFolderPath);

    expect(dtAssets.fileHandler.createFile).toHaveBeenCalledWith(
      fileState[0],
      'path/to/main/common',
      'Add common-config-file1 to configuration folder',
    );

    expect(dtAssets.fileHandler.createFile).toHaveBeenCalledWith(
      fileState[1],
      'path/to/main/common/lifecycle',
      'Add common-lifecycle-file2 to lifecycle folder',
    );
  });

  it('should update file content in the digital twin folder when file has an extension', async () => {
    await dtAssets.updateFileContent(fileName, fileContent);

    expect(dtAssets.fileHandler.updateFile).toHaveBeenCalledWith(
      expectedFilePath,
      fileContent,
      commitMessage,
    );
  });

  it('should update file content in the lifecycle folder when file has no extension', async () => {
    await dtAssets.updateFileContent(fileName, fileContent);

    expect(dtAssets.fileHandler.updateFile).toHaveBeenCalledWith(
      expectedFilePath,
      fileContent,
      commitMessage,
    );
  });

  it('should return a message if trigger already exists in the pipeline', async () => {
    dtAssets.fileHandler.getFileContent = jest
      .fn()
      .mockResolvedValue(triggerContent);

    const result = await dtAssets.appendTriggerToPipeline();

    expect(dtAssets.fileHandler.getFileContent).toHaveBeenCalledWith(filePath);
    expect(result).toBe(`Trigger already exists in the pipeline for ${dtName}`);
    expect(dtAssets.fileHandler.updateFile).not.toHaveBeenCalled();
  });

  it('should append trigger to the pipeline', async () => {
    dtAssets.fileHandler.getFileContent = jest
      .fn()
      .mockResolvedValue('existing content');
    jest.spyOn(dtAssets.fileHandler, 'updateFile').mockResolvedValue();

    const result = await dtAssets.appendTriggerToPipeline();

    expect(dtAssets.fileHandler.getFileContent).toHaveBeenCalledWith(filePath);
    expect(result).toBe(`Trigger appended to pipeline for ${dtName}`);
  });

  it('should remove trigger from pipeline', async () => {
    dtAssets.fileHandler.getFileContent = jest
      .fn()
      .mockResolvedValue(triggerContent);
    jest.spyOn(dtAssets.fileHandler, 'updateFile').mockResolvedValue();

    const result = await dtAssets.removeTriggerFromPipeline();

    expect(result).toBe(`Trigger removed from pipeline for ${dtName}`);
    expect(dtAssets.fileHandler.updateFile).toHaveBeenCalledWith(
      filePath,
      '',
      'Remove trigger for DTName from .gitlab-ci.yml',
    );
  });

  it('should return a message if trigger does not exist in the pipeline', async () => {
    dtAssets.fileHandler.getFileContent = jest
      .fn()
      .mockResolvedValue('existing content');

    const result = await dtAssets.removeTriggerFromPipeline();

    expect(result).toBe(`No trigger found for ${dtName} in ${filePath}`);
    expect(dtAssets.fileHandler.updateFile).not.toHaveBeenCalled();
  });

  describe('removeTriggerFromPipeline error path', () => {
    it('should return error message when an exception occurs', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockRejectedValue(new Error('Read failed'));

      const result = await dtAssets.removeTriggerFromPipeline();

      expect(result).toBe(
        'Error removing trigger from pipeline: Error: Read failed',
      );
    });
  });

  describe('appendTriggerToPipeline error path', () => {
    it('should return error message when an exception occurs', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      const result = await dtAssets.appendTriggerToPipeline();

      expect(result).toBe(
        'Error appending trigger to pipeline: Error: Network error',
      );
    });
  });
});
