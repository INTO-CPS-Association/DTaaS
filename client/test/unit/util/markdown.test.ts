import { renderMarkdown, interopDefault } from 'util/markdown';

/**
 * Tests for rendering user-authored markdown.
 *
 * The attack cases come first because they are the reason this module exists.
 * Each one rendered and executed before the sanitising step was added, so each
 * is a regression test and not a hypothetical.
 *
 * The second group matters as much. A sanitiser that removed the markup
 * documents legitimately use would be replaced by the first person whose
 * equation stopped rendering, and the defect would come back with it.
 */

describe('renderMarkdown, against content that tries to execute', () => {
  it.each([
    ['an image error handler', '<img src=x onerror="alert(1)">'],
    ['a script element', '<script>alert(1)</script>'],
    ['a script inside SVG', '<svg><script>alert(1)</script></svg>'],
    [
      'a script inside MathML',
      '<math><mtext><script>alert(1)</script></mtext></math>',
    ],
    ['a javascript URL in a link', '<a href="javascript:alert(1)">click</a>'],
    ['an inline frame', '<iframe src="https://example.invalid"></iframe>'],
    ['a body load handler', '<body onload=alert(1)>'],
    [
      'an object with a data URL',
      '<object data="data:text/html,<script>alert(1)</script>"></object>',
    ],
    [
      'a form posting elsewhere',
      '<form action="https://example.invalid"><input name="a"></form>',
    ],
  ])('removes %s', (_name, payload) => {
    const html = renderMarkdown(payload);

    // Nothing the browser will act on. The payload may still appear as
    // visible text, escaped, which is the point: it is shown and not run.
    expect(html).not.toMatch(/<script|<iframe|<object|<form|<img|<svg|<math/i);
    expect(html).not.toMatch(/href="javascript:/i);
  });

  it('escapes the markup instead of dropping the text', () => {
    // A document whose author wrote HTML should still show something, so the
    // markup is escaped and displayed and the reader can see what was meant.
    const html = renderMarkdown('<b onclick="alert(1)">text</b>');

    expect(html).toContain('&lt;b');
    expect(html).toContain('text');
    expect(html).not.toMatch(/<b[\s>]/);
  });
});

describe('renderMarkdown, against content documents legitimately use', () => {
  it('renders markdown syntax', () => {
    const html = renderMarkdown('# Title\n\nSome **bold** text.');

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('keeps an http link and an http image', () => {
    const html = renderMarkdown(
      '[docs](https://example.org/page)\n\n![d](https://example.org/a.png)',
    );

    expect(html).toContain('href="https://example.org/page"');
    expect(html).toContain('src="https://example.org/a.png"');
  });

  it('keeps a table and a fenced code block', () => {
    const html = renderMarkdown(
      '| a |\n| --- |\n| 1 |\n\n```js\nconst a = 1;\n```',
    );

    expect(html).toContain('<table>');
    expect(html).toContain('<code');
  });

  it('shows inline HTML as text, which is what turning the parser off costs', () => {
    // Stated as a test so the trade is visible instead of discovered. A
    // document using literal HTML renders it escaped from now on.
    const html = renderMarkdown('<details><summary>More</summary></details>');

    expect(html).toContain('&lt;details&gt;');
    expect(html).not.toContain('<details>');
  });

  it('keeps the markup katex produces for an equation', () => {
    // katex output is produced by the plugin and not passed through as raw
    // HTML, so turning the HTML parser off leaves equations untouched.
    const html = renderMarkdown('Inline $E = mc^2$ and done.');

    expect(html).toContain('katex');
    expect(html).toContain('<math');
  });
});

describe('renderMarkdown, on input that is not a document', () => {
  it.each([
    ['an empty string', ''],
    ['whitespace only', '   \n  '],
  ])('handles %s without throwing', (_name, input) => {
    expect(() => renderMarkdown(input)).not.toThrow();
  });
});

describe('interopDefault', () => {
  it('returns the default export when the module wraps one', () => {
    const inner = () => 'plugin';
    expect(interopDefault({ default: inner })).toBe(inner);
  });

  it('returns the module itself when there is no default export', () => {
    const mod = () => 'plugin';
    expect(interopDefault(mod)).toBe(mod);
  });
});
