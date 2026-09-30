import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import MarkdownStyles, { MARKDOWN_CLASS } from 'components/MarkdownStyles';
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
          className={MARKDOWN_CLASS}
          dangerouslySetInnerHTML={{
            __html: renderedMarkdown,
          }}
          style={{
            maxWidth: '100%',
          }}
        />
        <MarkdownStyles />
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
