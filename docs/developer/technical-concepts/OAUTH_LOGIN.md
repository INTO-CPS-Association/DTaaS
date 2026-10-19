# OAuth Username Resolution in the React Client

## The Problem

The client used to extract the logged-in username in `Authentication.ts`
with a single, GitLab-specific method:

```typescript
const profileUrl = auth.user.profile.profile ?? '';
const username = profileUrl.split('/').filter(Boolean).pop() ?? '';
```

This assumed that the OIDC provider always exposes a `profile` claim
holding a URL whose last path segment is the username, which is what
GitLab does (`https://gitlab.example.com/username`). It failed silently
for other providers:

- Keycloak exposes `preferred_username`, not a profile URL.
- Native Dex also exposes `preferred_username` and no profile URL. A
  companion Python proxy was built to inject a synthetic `profile` URL
  as a workaround.
- For any OIDC provider without a `profile` URL, the username became
  `""` with no error.

`AccountTabData.tsx` made the same assumption when displaying and linking
the profile.

## The Solution: a provider-agnostic resolver module

`client/src/util/auth/oauthUserProfile.ts` holds all claim resolution
logic in one module. It exports three functions.

### `resolveOAuthUsername(profile)`

Walks a fixed priority chain and returns the first usable value:

```text
1. preferred_username   ← Keycloak, Dex, most OIDC
2. username             ← some custom providers
3. nickname             ← OpenID standard optional claim
4. login                ← GitHub-style providers
5. local part of email  ← Dex connector fallback (e.g. "alice" from "alice@example.com")
6. local part of upn    ← Azure AD / Entra ID
7. last path segment of profile URL  ← GitLab (preserves old behaviour)
8. sub                  ← worst-case fallback, always present
```

The chain is ordered by reliability and specificity. GitLab's URL-based
extraction sits at step 7 for backward compatibility, and `sub` is the
last resort.

`isSafeUsername()` checks each candidate before it is accepted. A
candidate is used only if it matches `^[A-Za-z0-9._@+-]+$` and does not
contain `..`; otherwise the chain falls through to the next claim.
Because the check applies to every candidate, `sub` included, the
function returns an empty string when no claim yields a path-safe value,
even if other claims are present. This protects the URL paths described
in
[Downstream coupling](#downstream-coupling-username-as-gitlab-namespace).

### `resolveOAuthProfileUrl(profile)`

Looks for `profile`, then `html_url` (GitHub). Before returning, it
passes the candidate through `isSafeExternalUrl()`, which rejects any
protocol other than `http:` or `https:`. This prevents XSS through
`javascript:` or `data:` URLs placed in the `href` of the profile link.
The function returns `undefined` instead of an unsafe URL.

### `resolveOAuthPictureUrl(profile)`

Looks for `picture` (GitLab), then `avatar_url`, and applies the same
`isSafeExternalUrl()` check. It returns `undefined` when the provider
supplies no usable picture, and the caller falls back to an initial or
an icon.

## Callers

### `Authentication.ts`: `useGetAndSetUsername`

A single call replaces the GitLab-specific URL parsing:

```typescript
// before
const profileUrl = auth.user.profile.profile ?? '';
const username = profileUrl.split('/').filter(Boolean).pop() ?? '';
sessionStorage.setItem('username', username ?? '');

// after
const username = resolveOAuthUsername(auth.user.profile);
sessionStorage.setItem('username', username);
```

This is where the username is written to Redux state and
`sessionStorage`, from where the rest of the application reads it.

### `AccountTabData.tsx`: `ProfileTab` and `SettingsTab`

Both components call the resolver functions. When the provider does not
expose a profile URL (Keycloak by default, Dex), the UI shows "Your OAuth
provider did not expose a profile URL." instead of a broken link:

```typescript
{profileUrl ? profileSettingsText : profileNotAvailableText}
```

`MenuToolbar.tsx`, `route/auth/PrivateRoute.tsx` and `util/envUtil.ts`
also call `resolveOAuthUsername`, and `MenuToolbar.tsx` calls
`resolveOAuthPictureUrl` for the avatar.

## Internal module structure

`oauthUserProfile.ts` is built from small private functions:

- `getClaim` reads a string claim from the profile, trims it and
  returns `undefined` for missing, non-string or empty values.
- `getEmailLocalPart` splits on `@` and returns the local part.
- `pathFromProfileUrl` parses the value with `new URL()` and returns its
  `pathname`. For a value that is not an absolute URL, it falls back to
  the raw path when the value contains `/`.
- `getUsernameFromProfileUrl` returns the last segment of that path.
- `isSafeExternalUrl` parses with `new URL()` (no regex) and allows
  only `http:` and `https:`.
- `isSafeUsername` restricts a resolved username to a URL-path-safe
  character set and rejects `..`, so an unsafe claim is skipped.
- `firstDefinedValue` returns the first entry of an array that is not
  `undefined`. `resolveOAuthProfileUrl` and `resolveOAuthPictureUrl`
  use it.

None of the seven is exported. The module's public surface is the three
`resolve*` functions (`resolveOAuthUsername`, `resolveOAuthProfileUrl`
and `resolveOAuthPictureUrl`).

## Downstream coupling: username as GitLab namespace

The resolver is provider-agnostic, but the resolved username is more
than a display string. It is stored in `sessionStorage` and Redux, and
the GitLab backend layer then uses it as a namespace, inserted
unencoded into URL paths such as:

```text
${authority}/${group}/${username}/-/raw/${branch}/...
```

(`lib/dt-automation/src/digitalTwin.ts`,
`lib/dt-automation/src/libraryAsset.ts`, and the workbench and service
links in `util/envUtil.ts` and `route/workbench`).

This has two consequences:

1. Security: because the value ends up unencoded in a URL path,
   `isSafeUsername` validates it at the single point of resolution, so a
   crafted claim cannot inject path separators or `..` traversal. The
   input is a signed OIDC token and GitLab enforces authorization on the
   server, so this is defence in depth, not a fix for an exploitable
   hole.
2. Operations: for a provider other than GitLab (Keycloak, Dex, GitHub),
   the resolved username must match an existing GitLab account.
   Otherwise sign-in succeeds while every GitLab-backed request fails.
   The client is provider-agnostic, but the backend identity model is
   still GitLab, so keep provider usernames aligned with GitLab
   usernames.

## Effect on provider-specific infrastructure

A companion Python service for Dex used to exist only to work around the
old GitLab assumption. It intercepted `/dex/userinfo` responses and
injected a synthetic `profile` URL of the form
`{issuer}/{preferred_username}` so that the GitLab-specific parser could
extract the username.

Because `preferred_username` is now checked first, Keycloak and Dex both
resolve usernames from standard claims. The companion service is no
longer needed and is not part of `deploy/workspace/dex/localhost/`.
