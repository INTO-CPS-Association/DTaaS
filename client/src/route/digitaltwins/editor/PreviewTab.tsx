import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { renderMarkdown } from 'util/markdown';

interface PreviewProps {
  readonly fileContent: string;
  readonly fileType: string;
}

function PreviewTab({ fileContent, fileType }: PreviewProps) {
  if (fileType === 'md') {
    const renderedMarkdown = renderMarkdown(fileContent);

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

  let language = 'bash';
  if (fileType === 'json') {
    language = 'json';
  } else if (fileType === 'yaml' || fileType === 'yml') {
    language = 'yaml';
  }

  return (
    <SyntaxHighlighter language={language}>{fileContent}</SyntaxHighlighter>
  );
}

export default PreviewTab;
