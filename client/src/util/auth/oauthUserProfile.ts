type OAuthProfile = Record<string, unknown> | null | undefined;

const USERNAME_CLAIM_PRIORITY = [
  'preferred_username',
  'username',
  'nickname',
  'login',
] as const;

const PROFILE_URL_CLAIM_PRIORITY = ['profile', 'html_url'] as const;
const ALLOWED_PROFILE_URL_PROTOCOLS = new Set(['http:', 'https:']);
const SAFE_USERNAME_PATTERN = /^[A-Za-z0-9._@+-]+$/;

function getClaim(profile: OAuthProfile, claim: string): string | undefined {
  if (!profile) {
    return undefined;
  }
  const claimValue = profile[claim];
  if (typeof claimValue !== 'string') {
    return undefined;
  }
  const trimmedClaimValue = claimValue.trim();
  return trimmedClaimValue.length > 0 ? trimmedClaimValue : undefined;
}

function getEmailLocalPart(identifier: string | undefined): string | undefined {
  if (!identifier) {
    return undefined;
  }
  const localPart = identifier.split('@')[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : undefined;
}

function pathFromProfileUrl(profileUrl: string): string | undefined {
  try {
    return new URL(profileUrl).pathname;
  } catch {
    // Relative value (e.g. /group/user or example/user): use it only when it
    // looks like a path, so non-path strings do not resolve to a username.
    const rawPath = profileUrl.split(/[?#]/)[0];
    return rawPath.includes('/') ? rawPath : undefined;
  }
}

function getUsernameFromProfileUrl(
  profileUrl: string | undefined,
): string | undefined {
  if (!profileUrl) {
    return undefined;
  }
  const path = pathFromProfileUrl(profileUrl);
  if (path === undefined) {
    return undefined;
  }
  const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
  const lastSegment = normalizedPath
    .slice(normalizedPath.lastIndexOf('/') + 1)
    .trim();
  return lastSegment || undefined;
}

function firstDefinedValue(
  values: Array<string | undefined>,
): string | undefined {
  return values.find((value) => value !== undefined);
}

// The resolved username is consumed unencoded as a GitLab namespace in backend
// URL paths (e.g. `${authority}/${group}/${username}/-/raw/...`). Restrict it to
// a charset that cannot break out of a URL path segment and reject `..` to
// prevent path traversal. Unsafe candidates fall through to the next claim.
function isSafeUsername(value: string): boolean {
  return SAFE_USERNAME_PATTERN.test(value) && !value.includes('..');
}

function isSafeExternalUrl(urlValue: string): boolean {
  try {
    const parsedUrl = new URL(urlValue);
    return ALLOWED_PROFILE_URL_PROTOCOLS.has(parsedUrl.protocol);
  } catch {
    return false;
  }
}

export function resolveOAuthUsername(profile: OAuthProfile): string {
  const usernameClaimValues = USERNAME_CLAIM_PRIORITY.map((claim) =>
    getClaim(profile, claim),
  );
  const username = [
    ...usernameClaimValues,
    getEmailLocalPart(getClaim(profile, 'email')),
    getEmailLocalPart(getClaim(profile, 'upn')),
    getUsernameFromProfileUrl(getClaim(profile, 'profile')),
    getClaim(profile, 'sub'),
  ].find((value) => value !== undefined && isSafeUsername(value));
  return username ?? '';
}

export function resolveOAuthProfileUrl(
  profile: OAuthProfile,
): string | undefined {
  const profileClaimValues = PROFILE_URL_CLAIM_PRIORITY.map((claim) =>
    getClaim(profile, claim),
  );
  const profileUrl = firstDefinedValue(profileClaimValues);
  if (!profileUrl) {
    return undefined;
  }
  return isSafeExternalUrl(profileUrl) ? profileUrl : undefined;
}
