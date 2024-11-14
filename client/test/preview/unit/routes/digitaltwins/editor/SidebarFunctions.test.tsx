import { fireEvent, render, screen } from '@testing-library/react';
import * as SidebarFunctions from 'preview/route/digitaltwins/editor/sidebarFunctions';
import { FileState } from 'preview/store/file.slice';
import { mockDigitalTwin as mockDigitalTwinInstance } from 'test/preview/__mocks__/global_mocks'; // Rinominato
import { SimpleTreeView } from '@mui/x-tree-view';
import * as React from 'react';
import DigitalTwin from 'preview/util/digitalTwin';

describe('SidebarFunctions', () => {
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  const setErrorMessage = jest.fn();
  const dispatch = jest.fn();
  const setIsFileNameDialogOpen = jest.fn();
  const setNewFileName = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  const files: FileState[] = []; // spostato qui per evitare conflitti di scope

  it('should return the correct file type from the extension', () => {
    expect(SidebarFunctions.getFileTypeFromExtension('file.md')).toBe(
      'description',
    );
    expect(SidebarFunctions.getFileTypeFromExtension('file.json')).toBe(
      'config',
    );
    expect(SidebarFunctions.getFileTypeFromExtension('file.yaml')).toBe(
      'config',
    );
    expect(SidebarFunctions.getFileTypeFromExtension('file.yml')).toBe(
      'config',
    );
    expect(SidebarFunctions.getFileTypeFromExtension('file')).toBe('lifecycle');
  });

  it('should handle file click correctly in create tab', () => {
    const tab = 'create';
    const handleCreateFileClick = jest
      .spyOn(SidebarFunctions, 'handleCreateFileClick')
      .mockImplementation(jest.fn());

    SidebarFunctions.handleFileClick(
      'file',
      null,
      setFileName,
      setFileContent,
      setFileType,
      files,
      tab,
    );

    expect(handleCreateFileClick).toHaveBeenCalled();
  });

  it('should handle file click correctly in reconfigure tab', () => {
    const tab = 'reconfigure';
    const handleReconfigureFileClick = jest
      .spyOn(SidebarFunctions, 'handleReconfigureFileClick')
      .mockImplementation(jest.fn());

    SidebarFunctions.handleFileClick(
      'file',
      null,
      setFileName,
      setFileContent,
      setFileType,
      files,
      tab,
    );

    expect(handleReconfigureFileClick).toHaveBeenCalled();
  });

  it('should render file tree items correctly and handle file click', () => {
    const handleFileClick = jest
      .spyOn(SidebarFunctions, 'handleFileClick')
      .mockImplementation(jest.fn());

    render(
      <SimpleTreeView>
        {SidebarFunctions.renderFileTreeItems(
          'label',
          ['file'],
          mockDigitalTwinInstance, // Rinominato
          setFileName,
          setFileContent,
          setFileType,
          files,
          'create',
        )}
      </SimpleTreeView>,
    );

    expect(screen.getByText('label')).toBeInTheDocument();
    fireEvent.click(screen.getByText('label'));
    expect(screen.getByText('file')).toBeInTheDocument();
    fireEvent.click(screen.getByText('file'));

    expect(handleFileClick).toHaveBeenCalled();
  });

  it('should get filtered files name correctly', () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'content', isNew: false, isModified: false },
      { name: 'file2', content: 'content', isNew: true, isModified: false },
      { name: 'file3', content: 'content', isNew: true, isModified: false },
    ];
    expect(
      SidebarFunctions.getFilteredFileNames('lifecycle', testFiles),
    ).toEqual(['file2', 'file3']);
  });

  it('should render file section correctly and handle file click', () => {
    const handleFileClick = jest
      .spyOn(SidebarFunctions, 'handleFileClick')
      .mockImplementation(jest.fn());

    render(
      <SimpleTreeView>
        {SidebarFunctions.renderFileSection(
          'label',
          'type',
          ['file'],
          mockDigitalTwinInstance, // Rinominato
          setFileName,
          setFileContent,
          setFileType,
          files,
          'create',
        )}
      </SimpleTreeView>,
    );

    expect(screen.getByText('label')).toBeInTheDocument();
    fireEvent.click(screen.getByText('label'));
    expect(screen.getByText('file')).toBeInTheDocument();

    fireEvent.click(screen.getByText('file'));
    expect(handleFileClick).toHaveBeenCalledWith(
      'file',
      mockDigitalTwinInstance, // Rinominato
      setFileName,
      setFileContent,
      setFileType,
      files,
      'create',
    );
  });

  it('should not call updateFileState if no new file is found', () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'content', isNew: false, isModified: false },
    ];
    const updateFileStateSpy = jest.spyOn(SidebarFunctions, 'updateFileState');

    SidebarFunctions.handleCreateFileClick(
      'nonExistentFile',
      testFiles,
      setFileName,
      setFileContent,
      setFileType,
    );

    expect(updateFileStateSpy).not.toHaveBeenCalled();
  });

  it('should set file content error message when fetching fails', async () => {
    const mockDigitalTwin: DigitalTwin = {
      fileHandler: {
        getFileContent: jest.fn().mockRejectedValue(new Error('Fetch error')),
      },
    } as unknown as DigitalTwin;

    const fileName = 'testFile.md';

    await SidebarFunctions.fetchAndSetFileContent(
      fileName,
      mockDigitalTwin,
      setFileName,
      setFileContent,
      setFileType,
    );

    expect(setFileContent).toHaveBeenCalledWith(
      `Error fetching ${fileName} content`,
    );
  });

  it('should not handle file submit if name already exists', () => {
    const testFiles = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];
    SidebarFunctions.handleFileSubmit(
      testFiles,
      'file1',
      setErrorMessage,
      dispatch,
      setIsFileNameDialogOpen,
      setNewFileName,
    );
    expect(setErrorMessage).toHaveBeenCalledWith(
      'A file with this name already exists.',
    );
  });

  it('should not handle file submit if name is empty', () => {
    const testFiles = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];
    SidebarFunctions.handleFileSubmit(
      testFiles,
      '',
      setErrorMessage,
      dispatch,
      setIsFileNameDialogOpen,
      setNewFileName,
    );
    expect(setErrorMessage).toHaveBeenCalledWith("File name can't be empty.");
  });

  it('should handle file submit correctly', () => {
    const testFiles = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];
    SidebarFunctions.handleFileSubmit(
      testFiles,
      'file2',
      setErrorMessage,
      dispatch,
      setIsFileNameDialogOpen,
      setNewFileName,
    );
    expect(setErrorMessage).toHaveBeenCalledWith('');
    expect(dispatch).toHaveBeenCalled();
  });
});
