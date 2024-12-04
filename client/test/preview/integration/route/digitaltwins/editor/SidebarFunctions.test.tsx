import { handleFileClick } from "preview/route/digitaltwins/editor/sidebarFunctions";
import { FileState } from "preview/store/file.slice";

describe('SidebarFunctions', () => {
  const fileName = 'example.md';
  const asset = null;
  const mockSetFileName = jest.fn();
  const mockSetFileContent = jest.fn();
  const mockSetFileType = jest.fn();
  const mockSetFilePrivacy = jest.fn();
  const mockSetIsLibraryFile = jest.fn();
  const mockSetLibraryAssetPath = jest.fn();
  const mockDispatch = jest.fn();
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls handleFileClick if tab is "create"', () => {
    const mockFiles: FileState[] = [
      { name: fileName, content: 'content', isNew: true, isModified: false },
    ];
    handleFileClick(fileName, asset, mockSetFileName, mockSetFileContent, mockSetFileType, mockSetFilePrivacy, mockFiles, 'create', mockSetIsLibraryFile, mockSetLibraryAssetPath, mockDispatch);
  });

  expect(mockSetFileName).toHaveBeenCalledWith(fileName);
  expect(mockSetFileContent).toHaveBeenCalledWith('content');
});