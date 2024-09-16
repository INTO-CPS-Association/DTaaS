import React from 'react';
// import Editor from '@monaco-editor/react'; // Uncomment this when the library is working

function EditorTab() {
  return (
    <div>
      <p>Editor monaco</p>
      {/* 
      Uncomment this section when the Monaco editor is working
      <Editor
        height="400px"
        defaultLanguage="markdown"
        value={editorValue}
        onChange={handleEditorChange}
      />
      */}
    </div>
  );
}

export default EditorTab;
