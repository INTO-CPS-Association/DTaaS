import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import Editor from '@monaco-editor/react';
import { useDispatch } from 'react-redux';
import { addOrUpdateLibraryFile } from 'model/store/libraryConfigFiles.slice';
import { addOrUpdateFile } from 'model/store/file.slice';

interface EditorTabProps {
  readonly tab: string;
  readonly fileName: string;
  readonly fileContent: string;
  readonly filePrivacy: string;
  readonly isLibraryFile: boolean;
  readonly libraryAssetPath: string;
  readonly setFileContent: Dispatch<SetStateAction<string>>;
}

export interface FileUpdateParams {
  readonly tab: string;
  readonly fileName: string;
  readonly filePrivacy: string;
  readonly isLibraryFile: boolean;
  readonly libraryAssetPath: string;
}

export interface EditorHandlers {
  readonly setEditorValue: Dispatch<SetStateAction<string>>;
  readonly setFileContent: Dispatch<SetStateAction<string>>;
  readonly dispatch: ReturnType<typeof useDispatch>;
}

const buildCreateAction = (params: FileUpdateParams, value: string) => {
  const isPrivate = params.filePrivacy === 'private';
  if (params.isLibraryFile) {
    return addOrUpdateLibraryFile({
      assetPath: params.libraryAssetPath,
      fileName: params.fileName,
      fileContent: value,
      isNew: true,
      isModified: true,
      isPrivate,
    });
  }
  return addOrUpdateFile({
    name: params.fileName,
    content: value,
    isNew: true,
    isModified: true,
  });
};

const buildReconfigureAction = (params: FileUpdateParams, value: string) => {
  if (params.isLibraryFile || params.libraryAssetPath !== '') {
    return addOrUpdateLibraryFile({
      assetPath: params.libraryAssetPath,
      fileName: params.fileName,
      fileContent: value,
      isNew: false,
      isModified: true,
      isPrivate: true,
    });
  }
  return addOrUpdateFile({
    name: params.fileName,
    content: value,
    isNew: false,
    isModified: true,
  });
};

export const handleEditorChange = (
  params: FileUpdateParams,
  value: string | undefined,
  handlers: EditorHandlers,
) => {
  const updatedValue = value || '';
  handlers.setEditorValue(updatedValue);
  handlers.setFileContent(updatedValue);

  const action =
    params.tab === 'create'
      ? buildCreateAction(params, updatedValue)
      : buildReconfigureAction(params, updatedValue);

  handlers.dispatch(action);
};

function EditorTab({
  tab,
  fileName,
  fileContent,
  filePrivacy,
  isLibraryFile,
  libraryAssetPath,
  setFileContent,
}: EditorTabProps) {
  const [editorValue, setEditorValue] = useState(fileContent);
  const dispatch = useDispatch();

  useEffect(() => {
    setEditorValue(fileContent);
  }, [fileContent]);

  return (
    <div style={{ position: 'relative', height: '400px' }}>
      {fileName === '' ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            color: 'black',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          Please select a file to edit.
        </div>
      ) : (
        <Editor
          height="400px"
          defaultLanguage="markdown"
          value={editorValue}
          onChange={(value) =>
            handleEditorChange(
              { tab, fileName, filePrivacy, isLibraryFile, libraryAssetPath },
              value,
              { setEditorValue, setFileContent, dispatch },
            )
          }
        />
      )}
    </div>
  );
}

export default EditorTab;
