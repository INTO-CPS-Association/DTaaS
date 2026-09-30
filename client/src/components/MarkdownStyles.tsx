/**
 * The stylesheet for rendered markdown.
 *
 * `renderMarkdown` returns HTML that is inserted as markup, so the elements it
 * produces carry no class names and cannot be reached by a styled component.
 * A plain stylesheet is what reaches them, and it lives here once because the
 * preview tab and the details dialog render the same markup and need the same
 * rules.
 *
 * Every rule is prefixed with the class the two of them put on the element that
 * holds the markup, so the stylesheet reaches that markup and nothing else. A
 * bare `img` or `table` selector applies to the whole document for as long as
 * either is mounted, which is not what a component's stylesheet should do, even
 * where a class selector elsewhere happens to win on specificity.
 */

import { grey } from 'theme/tokens';

/** The class the element holding rendered markdown carries. */
export const MARKDOWN_CLASS = 'markdown-body';

function MarkdownStyles() {
  return (
    <style>{`
      .${MARKDOWN_CLASS} img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      }
      .${MARKDOWN_CLASS} table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      .${MARKDOWN_CLASS} th,
      .${MARKDOWN_CLASS} td {
        border: 1px solid ${grey[300]};
        padding: 8px;
        text-align: left;
      }
      .${MARKDOWN_CLASS} th {
        background-color: ${grey[100]};
      }
    `}</style>
  );
}

export default MarkdownStyles;
