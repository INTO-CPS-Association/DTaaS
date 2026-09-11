/**
 * Rendering user-authored markdown into HTML that is safe to insert.
 *
 * Two components display markdown a user wrote, and both built their own
 * Remarkable with `html: true` and passed the result to
 * `dangerouslySetInnerHTML`. An `<img src=x onerror=...>` inside a markdown
 * file therefore reached the DOM and ran, against an origin whose
 * sessionStorage holds the access token.
 *
 * Rendering lives here so a third component cannot reintroduce that by
 * configuring Remarkable itself. `html: false` is what closes it, at the cost
 * of showing literal HTML as text. Everything Remarkable produces itself is
 * unaffected, which is markdown syntax, links, images, tables, code blocks
 * and katex equations.
 */

import { Remarkable } from 'remarkable';
// @ts-expect-error: no type definitions are published for 'remarkable-katex'.
import RemarkableKatexModule from 'remarkable-katex';

const RemarkableKatex =
  (RemarkableKatexModule as { default?: unknown }).default ??
  RemarkableKatexModule;

const renderer = new Remarkable({
  html: false,
  typographer: true,
}).use(RemarkableKatex as never);

/** The markdown as HTML, with nothing in it that a browser will execute. */
export function renderMarkdown(source: string): string {
  return renderer.render(source);
}

export default renderMarkdown;
