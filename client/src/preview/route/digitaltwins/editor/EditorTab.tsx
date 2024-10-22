import * as React from 'react';
import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import Editor from '@monaco-editor/react';
import { useDispatch } from 'react-redux';
import { addOrUpdateFile } from '../../../store/file.slice';

interface EditorTabProps {
  fileName: string;
  fileContent: string;
  setFileContent: Dispatch<SetStateAction<string>>;
}

const handleEditorChange = (
  value: string | undefined,
  setEditorValue: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  fileName: string,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  const updatedValue = value || '';
  setEditorValue(updatedValue);
  setFileContent(updatedValue);

  dispatch(
    addOrUpdateFile({
      name: fileName,
      content: updatedValue,
      isModified: true,
    }),
  );
};

function EditorTab({ fileName, fileContent, setFileContent }: EditorTabProps) {
  const [editorValue, setEditorValue] = useState(fileContent);
  const dispatch = useDispatch();

  useEffect(() => {
    setEditorValue(fileContent);
  }, [fileContent]);

  return (
    <div>
      <Editor
        height="400px"
        defaultLanguage="markdown"
        value={editorValue}
        onChange={(value) =>
          handleEditorChange(
            value,
            setEditorValue,
            setFileContent,
            fileName,
            dispatch,
          )
        }
      />
    </div>
  );
}

export default EditorTab;
