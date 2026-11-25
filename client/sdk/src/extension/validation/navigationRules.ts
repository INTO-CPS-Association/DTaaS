import { entries, ID_PATTERN, type UntypedExtension } from './validationUtils';

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

const ESCAPE_PROBLEM = String.raw`must not contain "." or ".." segments, backslashes, control characters or percent-encoded ".", "/" or "\"`;

const pathProblem = (path: string, prefix: string): string | undefined => {
  if (escapesPrefix(path)) return ESCAPE_PROBLEM;
  return isUnder(path, prefix) ? undefined : `must be under "${prefix}"`;
};

/**
 * A route path is relative to the extension's `/<id>` mount point. A leading
 * `/` would name an absolute app path and a dot segment could leave the
 * mount point once the router resolves it.
 */
const routeProblem = (path: string): string | undefined => {
  if (escapesPrefix(path)) return ESCAPE_PROBLEM;
  return path.startsWith('/')
    ? "must be relative to the extension's mount point"
    : undefined;
};

/** Route paths stay inside the extension's own `/<id>` mount point. */
export const checkRoutes = (ext: UntypedExtension): string[] =>
  entries(ext.routes).flatMap(({ item, index }) => {
    if (typeof item.path !== 'string') return [];
    const problem = routeProblem(item.path);
    return problem ? [`routes[${index}].path "${item.path}" ${problem}`] : [];
  });

/** Menu items stay inside the extension's own `/<id>` mount point. */
const checkNavigation = (ext: UntypedExtension): string[] => {
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
