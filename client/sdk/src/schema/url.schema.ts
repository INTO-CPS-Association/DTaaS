import { nonEmpty } from './common.schema';

/**
 * A placeholder origin for resolving relative paths. A path that resolves to
 * another origin, such as `//evil.example/a`, names a host and is refused.
 */
const RELATIVE_BASE = 'https://relative.invalid/';
const RELATIVE_ORIGIN = new URL(RELATIVE_BASE).origin;

interface UrlRule {
  /** Allowed schemes, lowercase and without the colon, e.g. `https`. */
  readonly schemes: readonly string[];
  /** Whether a path without a scheme, resolved by the host, is allowed. */
  readonly relative?: boolean;
}

/** The scheme the browser would see, or `undefined` for a relative path. */
const schemeOf = (value: string): string | undefined => {
  // The WHATWG parser is the one a browser uses, so it strips tabs, newlines
  // and leading control characters the same way, and `java\tscript:` cannot
  // slip past as an unknown scheme.
  try {
    return new URL(value).protocol.slice(0, -1);
  } catch {
    return undefined;
  }
};

const staysOnHost = (value: string) => {
  // A malformed absolute URL such as `http://[` fails here as well.
  try {
    return new URL(value, RELATIVE_BASE).origin === RELATIVE_ORIGIN;
  } catch {
    return false;
  }
};

const isAllowed = (value: string, rule: UrlRule) => {
  const scheme = schemeOf(value);
  if (scheme !== undefined) return rule.schemes.includes(scheme);
  return rule.relative === true && staysOnHost(value);
};

/**
 * Whether the URL names a user or a password before its host. A declaration
 * is committed to a repository, so a password written into it is readable by
 * everyone who can read the twin.
 */
const carriesCredentials = (value: string) => {
  try {
    const url = new URL(value, RELATIVE_BASE);
    return url.username !== '' || url.password !== '';
  } catch {
    // A malformed URL is refused by the scheme check.
    return false;
  }
};

const allowedText = (rule: UrlRule) => {
  const schemes = rule.schemes.map((s) => `${s}:`).join(', ');
  return rule.relative ? `${schemes} or a relative path` : schemes;
};

/**
 * A URL restricted to an allowlist of schemes and without credentials. An
 * allowlist, and not a blocklist of `javascript:` or `data:`, keeps a new or
 * obfuscated scheme out by default.
 */
export const urlSchema = (rule: UrlRule) =>
  nonEmpty
    .refine((value) => isAllowed(value, rule), {
      message: `Expected a URL with scheme ${allowedText(rule)}`,
    })
    .refine((value) => !carriesCredentials(value), {
      message:
        'A URL must not carry a user name or password. The host keeps credentials',
    });

export default urlSchema;
