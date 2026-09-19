/**
 * The stylesheet for rendered markdown.
 *
 * `renderMarkdown` returns HTML that is inserted as markup, so the elements it
 * produces carry no class names and cannot be reached by a styled component.
 * A plain stylesheet is what reaches them, and it lives here once because the
 * preview tab and the details dialog render the same markup and need the same
 * rules.
 */

import { grey } from 'theme/tokens';

function MarkdownStyles() {
  return (
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
        border: 1px solid ${grey[300]};
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: ${grey[100]};
      }
    `}</style>
  );
}

export default MarkdownStyles;
