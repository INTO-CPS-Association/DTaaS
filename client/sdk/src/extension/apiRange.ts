/**
 * Version ranges of the extension API, in the subset of npm's semver syntax a
 * manifest needs: an exact version (`1.2.0`), a caret (`^1.1`), a tilde
 * (`~1.1.0`), comparators joined by spaces (`>=1.1 <2`) and alternatives
 * joined by `||`. A missing minor or patch counts as 0. Pre-release tags are
 * not part of the API version, so they are not accepted.
 */

type Version = readonly [number, number, number];
type Comparator = readonly [string, Version];

const VERSION = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/;
const COMPARATOR = /^(\^|~|>=|<=|>|<|=)?(.+)$/;

function parseVersion(text: string): Version | undefined {
  const match = VERSION.exec(text);
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

function compare(left: Version, right: Version): number {
  const index = left.findIndex((part, i) => part !== right[i]);
  return index === -1 ? 0 : left[index] - right[index];
}

/** The upper bound of `^` and `~`, exclusive. */
function upperBound(operator: string, [major, minor]: Version): Version {
  if (operator === '~') return [major, minor + 1, 0];
  return major > 0 ? [major + 1, 0, 0] : [0, minor + 1, 0];
}

/** One comparator as one or two plain comparisons. */
function parseComparator(text: string): Comparator[] | undefined {
  const [, operator = '=', rest] = COMPARATOR.exec(text) ?? [];
  const version = rest === undefined ? undefined : parseVersion(rest);
  if (!version) return undefined;
  if (operator !== '^' && operator !== '~') return [[operator, version]];
  return [
    ['>=', version],
    ['<', upperBound(operator, version)],
  ];
}

/** The alternatives of a range, each a list of comparisons that must all hold. */
function parseRange(range: string): Comparator[][] | undefined {
  const sets = range.split('||').map((set) => {
    const parts = set.trim().split(/\s+/).filter(Boolean);
    const parsed = parts.map(parseComparator);
    if (parts.length === 0 || parsed.includes(undefined)) return undefined;
    return parsed.flat() as Comparator[];
  });
  return sets.includes(undefined) ? undefined : (sets as Comparator[][]);
}

const HOLDS: Readonly<Record<string, (order: number) => boolean>> = {
  '=': (order) => order === 0,
  '>': (order) => order > 0,
  '>=': (order) => order >= 0,
  '<': (order) => order < 0,
  '<=': (order) => order <= 0,
};

/** Whether `range` is written in the syntax above. */
export function isApiRange(range: unknown): range is string {
  return typeof range === 'string' && parseRange(range) !== undefined;
}

/** Whether the API `version` a host implements lies inside `range`. */
export function satisfiesApiRange(version: string, range: string): boolean {
  const parsed = parseVersion(version);
  const sets = parseRange(range);
  if (!parsed || !sets) return false;
  return sets.some((set) =>
    set.every(([operator, bound]) => HOLDS[operator](compare(parsed, bound))),
  );
}
