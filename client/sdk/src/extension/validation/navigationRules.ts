import { entries, ID_PATTERN, type Loose } from './validationUtils';

/** `/bim`, `/bim/x`, `/bim?q` and `/bim#h` are under `/bim`; `/bimx` is not. */
const isUnder = (path: string, prefix: string) =>
  path.startsWith(prefix) &&
  (path.length === prefix.length ||
    ['/', '?', '#'].includes(path.charAt(prefix.length)));

/**
 * A backslash, a control character, or a percent-encoded `.`, `/` or `\`.
 * The URL parser drops tabs and line breaks, so `/bim/.\t./admin` would
 * otherwise reach `/admin`.
 */
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARACTERS = /\\|[\u0000-\u001f\u007f]|%2e|%2f|%5c/i;

/**
 * Browsers resolve `.` and `..` segments and treat `\` as `/`, so
 * `/bim/../admin` passes a plain prefix check but opens `/admin`. Only the
 * part before `?` or `#` is a path, and the query may hold any text.
 */
const escapesPrefix = (path: string) => {
  const [pathPart] = path.split(/[?#]/, 1);
  return (
    UNSAFE_CHARACTERS.test(pathPart) ||
    pathPart.split('/').some((segment) => segment === '.' || segment === '..')
  );
};

const pathProblem = (path: string, prefix: string): string | undefined => {
  if (escapesPrefix(path)) {
    return 'must not contain "." or ".." segments, backslashes, control characters or percent-encoded ".", "/" or "\\"';
  }
  return isUnder(path, prefix) ? undefined : `must be under "${prefix}"`;
};

/** Menu items stay inside the extension's own `/<id>` mount point. */
const checkNavigation = (ext: Loose): string[] => {
  if (typeof ext.id !== 'string' || !ID_PATTERN.test(ext.id)) return [];
  const prefix = `/${ext.id}`;
  return entries(ext.navigation).flatMap(({ item, index }) => {
    if (typeof item.path !== 'string') return [];
    const problem = pathProblem(item.path, prefix);
    return problem
      ? [`navigation[${index}].path "${item.path}" ${problem}`]
      : [];
  });
};

export default checkNavigation;
