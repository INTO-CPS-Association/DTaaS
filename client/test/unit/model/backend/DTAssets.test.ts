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

  describe('buildCreateFileActions', () => {
    it('should return create actions for new files', () => {
      const files = [
        {
          name: 'file.json',
          content: 'content',
          isNew: true,
          isModified: false,
          type: FileType.CONFIGURATION,
        },
        {
          name: 'script',
          content: 'content2',
          isNew: true,
          isModified: false,
          type: FileType.LIFECYCLE,
        },
      ];

      const actions = dtAssets.buildCreateFileActions(
        files,
        'digital_twins/DTName',
        'digital_twins/DTName/lifecycle',
      );

      expect(actions).toEqual([
        {
          action: 'create',
          filePath: 'digital_twins/DTName/file.json',
          content: 'content',
        },
        {
          action: 'create',
          filePath: 'digital_twins/DTName/lifecycle/script',
          content: 'content2',
        },
      ]);
    });

    it('should skip files that are not new', () => {
      const files = [
        {
          name: 'existing.json',
          content: 'content',
          isNew: false,
          isModified: true,
          type: FileType.CONFIGURATION,
        },
      ];

      const actions = dtAssets.buildCreateFileActions(
        files,
        'digital_twins/DTName',
        'digital_twins/DTName/lifecycle',
      );

      expect(actions).toEqual([]);
    });

    it('should use common path for common library files', () => {
      const files = [
        {
          name: 'common-file',
          content: 'content',
          isNew: true,
          isModified: false,
          type: FileType.LIFECYCLE,
          isFromCommonLibrary: true,
        },
      ];

      const actions = dtAssets.buildCreateFileActions(
        files,
        'digital_twins/DTName',
        'digital_twins/DTName/lifecycle',
      );

      expect(actions).toEqual([
        {
          action: 'create',
          filePath: 'digital_twins/DTName/common/lifecycle/common-file',
          content: 'content',
        },
      ]);
    });
  });

  describe('buildTriggerAction', () => {
    it('should return null if trigger already exists', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValue(triggerContent);

      const action = await dtAssets.buildTriggerAction();

      expect(action).toBeNull();
    });

    it('should return update action with appended trigger', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValue('existing content');

      const action = await dtAssets.buildTriggerAction();

      expect(action).not.toBeNull();
      expect(action!.action).toBe('update');
      expect(action!.filePath).toBe('.gitlab-ci.yml');
      expect(action!.content).toContain('existing content');
      expect(action!.content).toContain(`trigger_${dtName}`);
    });
  });

  describe('getFilesFromAsset', () => {
    it('should fetch files from asset and return them', async () => {
      dtAssets.fileHandler.getLibraryFileNames = jest
        .fn()
        .mockResolvedValue(['file1.json', 'file2.yml']);
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValueOnce('content1')
        .mockResolvedValueOnce('content2');

      const result = await dtAssets.getFilesFromAsset('assets/myAsset', true);

      expect(result).toEqual([
        {
          name: 'file1.json',
          content: 'content1',
          path: 'assets/myAsset',
          isPrivate: true,
        },
        {
          name: 'file2.yml',
          content: 'content2',
          path: 'assets/myAsset',
          isPrivate: true,
        },
      ]);
      expect(dtAssets.fileHandler.getLibraryFileNames).toHaveBeenCalledWith(
        'assets/myAsset',
        true,
      );
      expect(dtAssets.fileHandler.getFileContent).toHaveBeenCalledWith(
        'assets/myAsset/file1.json',
        true,
      );
    });

    it('should throw error when fetching files fails', async () => {
      dtAssets.fileHandler.getLibraryFileNames = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      await expect(
        dtAssets.getFilesFromAsset('assets/myAsset', false),
      ).rejects.toThrow('Error fetching files from asset at assets/myAsset');
    });
  });

  describe('updateLibraryFileContent', () => {
    it('should update library file content', async () => {
      dtAssets.fileHandler.updateFile = jest.fn().mockResolvedValue(undefined);
      const assetPath = 'common/digital_twins/myAsset';

      await dtAssets.updateLibraryFileContent(
        'config.json',
        'new content',
        assetPath,
      );

      expect(dtAssets.fileHandler.updateFile).toHaveBeenCalledWith(
        `${assetPath}/config.json`,
        'new content',
        'Update config.json content',
      );
    });
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

  describe('delete', () => {
    it('should remove trigger, delete DT folder, and delete common library DT if it exists', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValue('existing content');
      dtAssets.fileHandler.updateFile = jest.fn().mockResolvedValue(undefined);
      dtAssets.fileHandler.deleteDT = jest.fn().mockResolvedValue(undefined);
      dtAssets.fileHandler.getFolders = jest
        .fn()
        .mockResolvedValue([`common/digital_twins/${dtName}`]);

      await dtAssets.delete();

      expect(dtAssets.fileHandler.deleteDT).toHaveBeenCalledWith(
        `digital_twins/${dtName}`,
      );
      expect(dtAssets.fileHandler.deleteDT).toHaveBeenCalledWith(
        `common/digital_twins/${dtName}`,
      );
    });

    it('should not delete common library DT if it does not exist', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValue('existing content');
      dtAssets.fileHandler.updateFile = jest.fn().mockResolvedValue(undefined);
      dtAssets.fileHandler.deleteDT = jest.fn().mockResolvedValue(undefined);
      dtAssets.fileHandler.getFolders = jest
        .fn()
        .mockResolvedValue(['common/digital_twins/otherDT']);

      await dtAssets.delete();

      expect(dtAssets.fileHandler.deleteDT).toHaveBeenCalledWith(
        `digital_twins/${dtName}`,
      );
      expect(dtAssets.fileHandler.deleteDT).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFileContent', () => {
    it('should get file content from digital twin folder for file with extension', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValue('file content');

      const result = await dtAssets.getFileContent('config.json');

      expect(dtAssets.fileHandler.getFileContent).toHaveBeenCalledWith(
        `digital_twins/${dtName}/config.json`,
      );
      expect(result).toBe('file content');
    });

    it('should get file content from lifecycle folder for file without extension', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValue('lifecycle content');

      const result = await dtAssets.getFileContent('create');

      expect(dtAssets.fileHandler.getFileContent).toHaveBeenCalledWith(
        `digital_twins/${dtName}/lifecycle/create`,
      );
      expect(result).toBe('lifecycle content');
    });
  });

  describe('getLibraryFileContent', () => {
    it('should get library file content', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValue('library content');

      const result = await dtAssets.getLibraryFileContent(
        'common/assets/myAsset',
        'data.json',
      );

      expect(dtAssets.fileHandler.getFileContent).toHaveBeenCalledWith(
        'common/assets/myAsset/data.json',
      );
      expect(result).toBe('library content');
    });
  });

  describe('getFileNames', () => {
    it('should get file names by type', async () => {
      dtAssets.fileHandler.getFileNames = jest
        .fn()
        .mockResolvedValue(['file1.json', 'file2.yml']);

      const result = await dtAssets.getFileNames(FileType.CONFIGURATION);

      expect(dtAssets.fileHandler.getFileNames).toHaveBeenCalledWith(
        FileType.CONFIGURATION,
      );
      expect(result).toEqual(['file1.json', 'file2.yml']);
    });
  });

  describe('getLibraryConfigFileNames', () => {
    it('should get library config file names', async () => {
      dtAssets.fileHandler.getLibraryConfigFileNames = jest
        .fn()
        .mockResolvedValue(['config.json', 'settings.yml']);

      const result = await dtAssets.getLibraryConfigFileNames(
        'common/digital_twins/myDT',
      );

      expect(
        dtAssets.fileHandler.getLibraryConfigFileNames,
      ).toHaveBeenCalledWith('common/digital_twins/myDT', true);
      expect(result).toEqual(['config.json', 'settings.yml']);
    });
  });

  describe('getFolders', () => {
    it('should get folders', async () => {
      dtAssets.fileHandler.getFolders = jest
        .fn()
        .mockResolvedValue(['folder1', 'folder2']);

      const result = await dtAssets.getFolders('digital_twins/myDT');

      expect(dtAssets.fileHandler.getFolders).toHaveBeenCalledWith(
        'digital_twins/myDT',
      );
      expect(result).toEqual(['folder1', 'folder2']);
    });
  });
});
