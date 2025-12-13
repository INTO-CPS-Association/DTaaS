import { Remarkable } from 'remarkable';
import 'katex/dist/katex.min.css';
// @ts-expect-error: Ignoring TypeScript error due to missing type definitions for 'remarkable-katex'.
import * as RemarkableKatex from 'remarkable-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

interface PreviewProps {
  fileContent: string;
  fileType: string;
}

function PreviewTab({ fileContent, fileType }: PreviewProps) {
  if (fileType === 'md') {
    const md = new Remarkable({
      html: true,
      typographer: true,
    }).use(RemarkableKatex);

    const renderedMarkdown = md.render(fileContent);

    return (
      <div
        style={{
          width: '100%',
          overflowWrap: 'break-word',
          wordWrap: 'break-word',
          whiteSpace: 'normal',
          overflow: 'hidden',
        }}
      >
        <div
          dangerouslySetInnerHTML={{
            __html: renderedMarkdown,
          }}
          style={{
            maxWidth: '100%',
          }}
        />
        <style>{`
          img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
          }
        `}</style>
      </div>
    );
  }

  if (fileType === 'json') {
    return <SyntaxHighlighter language="json">{fileContent}</SyntaxHighlighter>;
  }
  if (fileType === 'yaml' || fileType === 'yml') {
    return <SyntaxHighlighter language="yaml">{fileContent}</SyntaxHighlighter>;
  }
  return <SyntaxHighlighter language="bash">{fileContent}</SyntaxHighlighter>;
}

export default PreviewTab;
