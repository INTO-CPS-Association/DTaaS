# OAuth Username Resolution in the React Client

## The Problem

The client had a single, GitLab-specific method for extracting the
logged-in username in `Authentication.ts`:

```typescript
const profileUrl = auth.user.profile.profile ?? '';
const username = profileUrl.split('/').filter(Boolean).pop() ?? '';
```

This assumed the OIDC provider always exposes a `profile` claim
containing a URL whose last path segment is the username — the pattern
GitLab uses (`https://gitlab.example.com/username`). It fails silently
for any other provider:

- **Keycloak**: exposes `preferred_username`, not a profile URL
- **Dex** (native): exposes `preferred_username`, not a profile URL —
  which is why a companion Python proxy was built to inject a synthetic
  `profile` URL as a workaround
- **Any OIDC provider without a `profile` URL**: username becomes `""`
  with no error

The same hardcoded assumption existed in `AccountTabData.tsx` for
display and linking purposes.

## The Solution: a provider-agnostic resolver module

The fix introduces `client/src/util/auth/oauthUserProfile.ts` — a
single module that centralises all claim resolution logic. It exports
three functions:

### `resolveOAuthUsername(profile)`

Walks a fixed priority chain and returns the first usable value:

```
1. preferred_username   ← Keycloak, Dex, most OIDC
2. username             ← some custom providers
3. nickname             ← OpenID standard optional claim
4. login                ← GitHub-style providers
5. local part of email  ← Dex connector fallback (e.g. "alice" from "alice@example.com")
6. local part of upn    ← Azure AD / Entra ID
7. last path segment of profile URL  ← GitLab (preserves old behaviour)
8. sub                  ← worst-case fallback, always present
```

The chain is ordered by reliability and specificity, with GitLab's
URL-based extraction demoted to step 7 (still present for backward
compatibility) and `sub` as the final safety net so the function always
returns a non-empty string if any claim exists.

### `resolveOAuthProfileUrl(profile)`

Looks for `profile` then `html_url` (GitHub). It runs the candidate
through `isSafeExternalUrl()` before returning — a security check that
rejects anything that is not `http:` or `https:`, preventing XSS via
`javascript:` or `data:` URLs injected into the `href` of the profile
link. Returns `undefined` rather than an unsafe URL.

### `resolveOAuthDisplayName(profile, fallbackUsername)`

Prefers the OIDC `name` claim (full name, e.g. "Jane Doe") over
username-style claims. Used where a human-readable display name is more
appropriate than a login handle.

## How callers changed

**`Authentication.ts` — `useGetAndSetUsername`**

The three lines of GitLab-specific URL parsing are replaced by a single
call:

```typescript
// before
const profileUrl = auth.user.profile.profile ?? '';
const username = profileUrl.split('/').filter(Boolean).pop() ?? '';
sessionStorage.setItem('username', username ?? '');

// after
const username = resolveOAuthUsername(auth.user.profile);
sessionStorage.setItem('username', username);
```

This is where the username gets written to Redux state and
`sessionStorage` — the centralised point that feeds the rest of the
application.

**`AccountTabData.tsx` — `ProfileTab` and `SettingsTab`**

Both components now call the same resolver functions. When the provider
does not expose a profile URL (Keycloak default, Dex without companion),
the UI shows "Your OAuth provider did not expose a profile URL." instead
of rendering a broken link:

```typescript
{profileUrl ? profileSettingsText : profileNotAvailableText}
```

## Internal module structure

`oauthUserProfile.ts` is built from small, single-purpose private
functions:

- **`getClaim`** — safely reads a string claim from the profile, trims
  it, returns `undefined` for missing/non-string/empty values
- **`getEmailLocalPart`** — splits on `@` and returns the local part
- **`getUsernameFromProfileUrl`** — strips query/fragment, splits on
  `/`, returns the last segment
- **`isSafeExternalUrl`** — uses `new URL()` for parsing (no regex),
  allows only `http:` and `https:`
- **`firstDefinedValue`** — walks an array and returns the first
  non-undefined entry; drives the priority chain in `resolveOAuthUsername`

All five are unexported. The module's public surface is exactly the
three `resolve*` functions.

## Effect on provider-specific infrastructure

The Dex companion Python service
(`deploy/workspace/dex/localhost/companion/`) existed solely to paper
over the old code's GitLab assumption. It intercepted `/dex/userinfo`
responses and injected a synthetic `profile` URL of the form
`{issuer}/{preferred_username}` so that the GitLab-specific path parser
could extract the username.

With `preferred_username` now checked first, Keycloak and Dex both
resolve usernames directly from standard claims. The companion service
is no longer required for username resolution.
