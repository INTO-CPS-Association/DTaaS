import * as React from 'react';
import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import Editor from '@monaco-editor/react';
import { useDispatch } from 'react-redux';
import { addOrUpdateFile, addOrUpdateNewFile } from '../../../store/file.slice';

interface EditorTabProps {
  tab: string;
  fileName: string;
  fileContent: string;
  setFileContent: Dispatch<SetStateAction<string>>;
}

const handleEditorChange = (
  tab: string,
  value: string | undefined,
  setEditorValue: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  fileName: string,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  const updatedValue = value || '';
  setEditorValue(updatedValue);
  setFileContent(updatedValue);

  if (tab === 'create') {
    dispatch(
      addOrUpdateNewFile({
        name: fileName,
        content: updatedValue,
        isModified: true,
      }),
    );
  } else {
    dispatch(
      addOrUpdateFile({
        name: fileName,
        content: updatedValue,
        isModified: true,
      }),
    );
  }
};

function EditorTab({
  tab,
  fileName,
  fileContent,
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
