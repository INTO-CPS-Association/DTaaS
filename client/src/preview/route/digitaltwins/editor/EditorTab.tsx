/* eslint-disable no-console */

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

function EditorTab({ fileName, fileContent, setFileContent }: EditorTabProps) {
  const [editorValue, setEditorValue] = useState(fileContent);
  const dispatch = useDispatch();

  useEffect(() => {
    setEditorValue(fileContent);
  }, [fileContent]);

  const handleEditorChange = (value: string | undefined) => {
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

  return (
    <div>
      <Editor
        height="400px"
        defaultLanguage="markdown"
        value={editorValue}
        onChange={(value) => handleEditorChange(value)}
      />
    </div>
  );
}

export default EditorTab;
