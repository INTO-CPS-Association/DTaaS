import satisfies from 'semver/functions/satisfies.js';
import validVersion from 'semver/functions/valid.js';
import validRange from 'semver/ranges/valid.js';

/**
 * Version ranges of the extension API, read by npm's own `semver` package.
 * A kit copies the same range into `peerDependencies`, so the host and the
 * package manager must give the same answer for it: `~1` includes `1.5.0`,
 * `1.1` is every `1.1.x` and `^0.0.3` is `0.0.3` only.
 */

/** A longer text is not a range a person wrote, so it is refused unread. */
const MAX_RANGE_LENGTH = 256;

/**
 * Whether `range` is a semver range. The empty string is refused, although
 * npm reads it as `*`, because an extension that names no range should leave
 * the field out.
 */
export function isApiRange(range: unknown): range is string {
  return (
    typeof range === 'string' &&
    range.trim() !== '' &&
    range.length <= MAX_RANGE_LENGTH &&
    validRange(range) !== null
  );
}

/** Whether the API `version` a host implements lies inside `range`. */
export function satisfiesApiRange(version: string, range: string): boolean {
  if (validVersion(version) === null || !isApiRange(range)) return false;
  return satisfies(version, range);
}
