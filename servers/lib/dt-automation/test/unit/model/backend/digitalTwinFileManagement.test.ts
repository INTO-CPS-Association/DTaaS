import DigitalTwin from 'model/backend/digitalTwin';
import {
  FileType,
  LibraryAssetInterface,
} from 'model/backend/interfaces/sharedInterfaces';
import { getBranchName } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { createDT } from 'model/backend/util/digitalTwinFileManagement';
import { mockBackendInstance, mockDTAssets } from 'test/__mocks__/global_mocks';

describe('digitalTwinFileManagement', () => {
  let mockDT: DigitalTwin;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDT = {
      DTName: 'testDT',
      backend: {
        ...mockBackendInstance,
        getProjectId: jest.fn().mockReturnValue(1),
        api: {
          ...mockBackendInstance.api,
          commitMultipleActions: jest.fn().mockResolvedValue(undefined),
        },
      },
      DTAssets: {
        ...mockDTAssets,
        buildCreateFileActions: jest.fn().mockReturnValue([]),
        buildTriggerAction: jest.fn().mockResolvedValue(null),
        getFilesFromAsset: jest.fn().mockResolvedValue([]),
        getFolders: jest.fn().mockResolvedValue([]),
        getLibraryConfigFileNames: jest.fn().mockResolvedValue([]),
      },
      assetFiles: [],
    } as unknown as DigitalTwin;
  });

  describe('createDT', () => {
    const files = [
      {
        name: 'config.json',
        content: '{}',
        isNew: true,
        isModified: false,
        type: FileType.CONFIGURATION,
      },
    ];

    it('should create digital twin with file and trigger actions in a single commit', async () => {
      const fileActions = [
        {
          action: 'create' as const,
          filePath: 'digital_twins/testDT/config.json',
          content: '{}',
        },
      ];
      const triggerAction = {
        action: 'update' as const,
        filePath: '.gitlab-ci.yml',
        content: 'updated pipeline',
      };

      (mockDT.DTAssets.buildCreateFileActions as jest.Mock)
        .mockReturnValueOnce(fileActions)
        .mockReturnValueOnce([]); // asset actions (no cart assets)
      (mockDT.DTAssets.buildTriggerAction as jest.Mock).mockResolvedValue(
        triggerAction,
      );

      const result = await createDT(mockDT, files, [], []);

      expect(result).toBe(
        'testDT digital twin files initialized successfully.',
      );
      expect(mockDT.backend.api.commitMultipleActions).toHaveBeenCalledWith(
        1,
        getBranchName(),
        'Create testDT digital twin',
        [...fileActions, triggerAction],
      );
    });

    it('should skip trigger action when it returns null', async () => {
      const fileActions = [
        {
          action: 'create' as const,
          filePath: 'digital_twins/testDT/config.json',
          content: '{}',
        },
      ];

      (mockDT.DTAssets.buildCreateFileActions as jest.Mock)
        .mockReturnValueOnce(fileActions)
        .mockReturnValueOnce([]); // asset actions
      (mockDT.DTAssets.buildTriggerAction as jest.Mock).mockResolvedValue(null);

      await createDT(mockDT, files, [], []);

      expect(mockDT.backend.api.commitMultipleActions).toHaveBeenCalledWith(
        1,
        getBranchName(),
        'Create testDT digital twin',
        fileActions,
      );
    });

    it('should not call commitMultipleActions when there are no actions', async () => {
      (mockDT.DTAssets.buildCreateFileActions as jest.Mock).mockReturnValue([]);
      (mockDT.DTAssets.buildTriggerAction as jest.Mock).mockResolvedValue(null);

      const result = await createDT(mockDT, [], [], []);

      expect(result).toBe(
        'testDT digital twin files initialized successfully.',
      );
      expect(mockDT.backend.api.commitMultipleActions).not.toHaveBeenCalled();
    });

    it('should return error when projectId is missing', async () => {
      (mockDT.backend.getProjectId as jest.Mock).mockReturnValue(null);

      const result = await createDT(mockDT, files, [], []);

      expect(result).toBe(
        'Error initializing testDT digital twin files: Error: Create failed',
      );
    });

    it('should return error when commitMultipleActions fails', async () => {
      const fileActions = [
        {
          action: 'create' as const,
          filePath: 'file.txt',
          content: 'c',
        },
      ];
      (mockDT.DTAssets.buildCreateFileActions as jest.Mock).mockReturnValue(
        fileActions,
      );
      (mockDT.backend.api.commitMultipleActions as jest.Mock).mockRejectedValue(
        new Error('Commit error'),
      );

      const result = await createDT(mockDT, files, [], []);

      expect(result).toBe(
        'Error initializing testDT digital twin files: Error: Commit error',
      );
    });

    it('should include asset file actions when cart assets are provided', async () => {
      const cartAssets = [
        {
          name: 'myAsset',
          path: 'common/assets/myAsset',
          isPrivate: false,
        },
      ];
      const assetFileActions = [
        {
          action: 'create' as const,
          filePath: 'digital_twins/testDT/common/myAsset/data.json',
          content: 'asset data',
        },
      ];

      (mockDT.DTAssets.getFilesFromAsset as jest.Mock).mockResolvedValue([
        {
          name: 'data.json',
          content: 'asset data',
          path: 'p',
          isPrivate: false,
        },
      ]);
      (mockDT.DTAssets.buildCreateFileActions as jest.Mock)
        .mockReturnValueOnce([]) // file actions
        .mockReturnValueOnce(assetFileActions); // asset actions

      const result = await createDT(
        mockDT,
        [],
        cartAssets as unknown as LibraryAssetInterface[],
        [],
      );

      expect(result).toBe(
        'testDT digital twin files initialized successfully.',
      );
      expect(mockDT.backend.api.commitMultipleActions).toHaveBeenCalledWith(
        1,
        getBranchName(),
        'Create testDT digital twin',
        assetFileActions,
      );
    });
  });
});
