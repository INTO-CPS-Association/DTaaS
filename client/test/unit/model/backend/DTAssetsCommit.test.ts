import { FileType } from 'model/backend/interfaces/sharedInterfaces';
import DTAssets from 'model/backend/DTAssets';
import {
  mockBackendInstance,
  mockFileHandler,
} from 'test/__mocks__/global_mocks';

jest.mock('model/backend/fileHandler', () => ({
  default: jest.fn().mockImplementation(() => mockFileHandler),
}));

describe('DTAssets - Commit Operations', () => {
  let dtAssets: DTAssets;
  const dtName = 'DTName';
  const triggerKey = `trigger_${dtName}`;
  const triggerContent = `
    ${triggerKey}:
      stage: triggers
    `;

  beforeEach(() => {
    dtAssets = new DTAssets(dtName, mockBackendInstance);
    dtAssets.fileHandler = mockFileHandler;
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
});
