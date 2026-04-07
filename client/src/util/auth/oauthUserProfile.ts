type OAuthProfile = Record<string, unknown> | null | undefined;

const USERNAME_CLAIM_PRIORITY = [
  'preferred_username',
  'username',
  'nickname',
  'login',
] as const;

const PROFILE_URL_CLAIM_PRIORITY = ['profile', 'html_url'] as const;
const ALLOWED_PROFILE_URL_PROTOCOLS = new Set(['http:', 'https:']);

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

function getUsernameFromProfileUrl(
  profileUrl: string | undefined,
): string | undefined {
  if (!profileUrl) {
    return undefined;
  }
  const pathWithoutQuery = profileUrl.split('?')[0]?.split('#')[0] ?? '';
  const pathSegments = pathWithoutQuery.split('/').filter(Boolean);
  const username = pathSegments[pathSegments.length - 1]?.trim();
  return username && username.length > 0 ? username : undefined;
}

function firstDefinedValue(
  values: Array<string | undefined>,
): string | undefined {
  return values.find((value) => value !== undefined);
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
  const username = firstDefinedValue([
    ...usernameClaimValues,
    getEmailLocalPart(getClaim(profile, 'email')),
    getEmailLocalPart(getClaim(profile, 'upn')),
    getUsernameFromProfileUrl(getClaim(profile, 'profile')),
    getClaim(profile, 'sub'),
  ]);
  return username ?? '';
}

export function resolveOAuthDisplayName(
  profile: OAuthProfile,
  fallbackUsername: string,
): string {
  const trimmedFallbackUsername = fallbackUsername.trim();
  const displayName = firstDefinedValue([
    getClaim(profile, 'name'),
    getClaim(profile, 'preferred_username'),
    getClaim(profile, 'username'),
    getClaim(profile, 'nickname'),
    getClaim(profile, 'login'),
    trimmedFallbackUsername.length > 0 ? trimmedFallbackUsername : undefined,
  ]);
  return displayName ?? '';
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
