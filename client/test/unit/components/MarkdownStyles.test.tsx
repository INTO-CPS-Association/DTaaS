import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import MarkdownStyles, { MARKDOWN_CLASS } from 'components/MarkdownStyles';

describe('MarkdownStyles', () => {
  it('Scopes every rule to the element that holds the markdown', () => {
    // A bare img or table selector applies to the whole document for as long
    // as the preview tab or the details dialog is mounted. Each rule names the
    // class instead, so the stylesheet reaches the rendered markdown only.
    const { container } = render(<MarkdownStyles />);
    const css = container.querySelector('style')?.textContent ?? '';

    const selectors = css
      .split('}')
      .map((block) => block.split('{')[0].trim())
      .filter(Boolean)
      .flatMap((selector) => selector.split(',').map((one) => one.trim()));

    expect(selectors.length).toBeGreaterThan(0);
    selectors.forEach((selector) =>
      expect(selector.startsWith(`.${MARKDOWN_CLASS} `)).toBe(true),
    );
  });
});
