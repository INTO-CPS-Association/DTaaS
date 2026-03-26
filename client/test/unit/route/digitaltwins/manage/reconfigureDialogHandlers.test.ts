import {
  saveChanges,
  handleFileUpdate,
  showSuccessSnackbar,
} from 'route/digitaltwins/manage/reconfigureDialogHandlers';
import { mockDigitalTwin } from 'test/__mocks__/global_mocks';
import {
  FileState,
  LibraryConfigFile,
} from 'model/backend/interfaces/sharedInterfaces';

describe('reconfigureDialogHandlers', () => {
  const dispatch = jest.fn();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('showSuccessSnackbar', () => {
    it('dispatches a success snackbar message', () => {
      showSuccessSnackbar(dispatch, 'testDT');

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            severity: 'success',
          }),
        }),
      );
    });
  });

  describe('handleFileUpdate', () => {
    it('calls updateFileContent for a regular DT file', async () => {
      const file: FileState = {
        name: 'test.md',
        content: 'content',
        isNew: false,
        isModified: true,
      };
      const updateFileContentSpy = jest
        .spyOn(mockDigitalTwin.DTAssets, 'updateFileContent')
        .mockResolvedValue(undefined);

      await handleFileUpdate(file, mockDigitalTwin, dispatch);

      expect(updateFileContentSpy).toHaveBeenCalledWith('test.md', 'content');
    });

    it('dispatches updateDescription when file is description.md', async () => {
      const file: FileState = {
        name: 'description.md',
        content: 'new description',
        isNew: false,
        isModified: true,
      };
      jest
        .spyOn(mockDigitalTwin.DTAssets, 'updateFileContent')
        .mockResolvedValue(undefined);

      await handleFileUpdate(file, mockDigitalTwin, dispatch);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            description: 'new description',
          }),
        }),
      );
    });

    it('calls updateLibraryFileContent for a library file', async () => {
      const file: LibraryConfigFile = {
        assetPath: 'lib/path',
        fileName: 'lib-file.md',
        fileContent: 'lib content',
        isNew: false,
        isModified: true,
        isPrivate: true,
      };
      const updateLibraryFileContentSpy = jest
        .spyOn(mockDigitalTwin.DTAssets, 'updateLibraryFileContent')
        .mockResolvedValue(undefined);

      await handleFileUpdate(file, mockDigitalTwin, dispatch);

      expect(updateLibraryFileContentSpy).toHaveBeenCalledWith(
        'lib-file.md',
        'lib content',
        'lib/path',
      );
    });

    it('dispatches error snackbar when update throws', async () => {
      const file: FileState = {
        name: 'fail.md',
        content: 'content',
        isNew: false,
        isModified: true,
      };
      jest
        .spyOn(mockDigitalTwin.DTAssets, 'updateFileContent')
        .mockRejectedValue(new Error('network error'));

      await handleFileUpdate(file, mockDigitalTwin, dispatch);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            severity: 'error',
          }),
        }),
      );
    });

    it('dispatches error snackbar when library file update throws', async () => {
      const file: LibraryConfigFile = {
        assetPath: 'lib/path',
        fileName: 'lib-fail.md',
        fileContent: 'content',
        isNew: false,
        isModified: true,
        isPrivate: true,
      };
      jest
        .spyOn(mockDigitalTwin.DTAssets, 'updateLibraryFileContent')
        .mockRejectedValue(new Error('lib error'));

      await handleFileUpdate(file, mockDigitalTwin, dispatch);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            message: expect.stringContaining('lib-fail.md'),
            severity: 'error',
          }),
        }),
      );
    });
  });

  describe('saveChanges', () => {
    it('saves modified DT files and dispatches cleanup actions', async () => {
      const modifiedFiles: FileState[] = [
        {
          name: 'file1.md',
          content: 'content1',
          isNew: false,
          isModified: true,
        },
      ];
      jest
        .spyOn(mockDigitalTwin.DTAssets, 'updateFileContent')
        .mockResolvedValue(undefined);

      await saveChanges(
        { modifiedFiles, modifiedLibraryFiles: [], name: 'testDT' },
        mockDigitalTwin,
        dispatch,
      );

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ severity: 'success' }),
        }),
      );
    });

    it('saves modified library files and dispatches cleanup actions', async () => {
      const modifiedLibraryFiles: LibraryConfigFile[] = [
        {
          assetPath: 'path',
          fileName: 'file.md',
          fileContent: 'content',
          isNew: false,
          isModified: true,
          isPrivate: true,
        },
      ];
      jest
        .spyOn(mockDigitalTwin.DTAssets, 'updateLibraryFileContent')
        .mockResolvedValue(undefined);

      await saveChanges(
        { modifiedFiles: [], modifiedLibraryFiles, name: 'testDT' },
        mockDigitalTwin,
        dispatch,
      );

      expect(dispatch).toHaveBeenCalled();
    });
  });
});
