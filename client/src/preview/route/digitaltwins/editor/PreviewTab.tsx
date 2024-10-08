import * as React from 'react';
import { Remarkable } from 'remarkable';
import SyntaxHighlighter from 'react-syntax-highlighter';

interface PreviewProps {
  fileContent: string;
  fileType: string;
}

function PreviewTab({ fileContent, fileType }: PreviewProps) {
  const md = new Remarkable();

  if (fileType === 'md') {
    const renderedMarkdown = md.render(fileContent);

    return <div dangerouslySetInnerHTML={{ __html: renderedMarkdown }} />;
  }
  if (fileType === 'json') {
    return <SyntaxHighlighter language="json">{fileContent}</SyntaxHighlighter>;
  }
  return <SyntaxHighlighter language="yaml">{fileContent}</SyntaxHighlighter>;
}

export default PreviewTab;
