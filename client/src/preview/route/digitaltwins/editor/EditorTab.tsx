import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import Editor from '@monaco-editor/react';
import { useDispatch } from 'react-redux';
import { addOrUpdateLibraryFile } from 'preview/store/libraryConfigFiles.slice';
import { addOrUpdateFile } from 'preview/store/file.slice';

interface EditorTabProps {
  tab: string;
  fileName: string;
  fileContent: string;
  filePrivacy: string;
  isLibraryFile: boolean;
  libraryAssetPath: string;
  setFileContent: Dispatch<SetStateAction<string>>;
}

export const handleEditorChange = (
  tab: string,
  value: string | undefined,
  setEditorValue: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  fileName: string,
  filePrivacy: string,
  isLibraryFile: boolean,
  libraryAssetPath: string,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  const updatedValue = value || '';
  setEditorValue(updatedValue);
  setFileContent(updatedValue);

  const isPrivate = filePrivacy === 'private';

  if (tab === 'create') {
    if (!isLibraryFile) {
      dispatch(
        addOrUpdateFile({
          name: fileName,
          content: updatedValue,
          isNew: true,
          isModified: true,
        }),
      );
    } else {
      dispatch(
        addOrUpdateLibraryFile({
          assetPath: libraryAssetPath,
          fileName,
          fileContent: updatedValue,
          isNew: true,
          isModified: true,
          isPrivate,
        }),
      );
    }
  } else if (!isLibraryFile && libraryAssetPath === '') {
    dispatch(
      addOrUpdateFile({
        name: fileName,
        content: updatedValue,
        isNew: false,
        isModified: true,
      }),
    );
  } else {
    dispatch(
      addOrUpdateLibraryFile({
        assetPath: libraryAssetPath,
        fileName,
        fileContent: updatedValue,
        isNew: false,
        isModified: true,
        isPrivate: true,
      }),
    );
  }
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
    <div style={{ position: 'relative' }}>
      <Editor
        height="400px"
        defaultLanguage="markdown"
        value={editorValue}
        onChange={(value) =>
          handleEditorChange(
            tab,
            value,
            setEditorValue,
            setFileContent,
            fileName,
            filePrivacy,
            isLibraryFile,
            libraryAssetPath,
            dispatch,
          )
        }
        options={{
          readOnly: fileName === '',
        }}
      />
      {fileName === '' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            color: 'black',
            zIndex: 1,
            fontSize: '16px',
            fontWeight: 'bold',
            pointerEvents: 'none',
          }}
        >
          Please select a file to edit.
        </div>
      )}
    </div>
  );
}

export default EditorTab;
