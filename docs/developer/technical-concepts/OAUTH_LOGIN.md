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
two functions:

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

The chain is ordered by reliability and specificity, with GitLab's
URL-based extraction demoted to step 7 (still present for backward
compatibility) and `sub` as the last-resort claim.

Each candidate is additionally checked by `isSafeUsername()` before it is
accepted. A candidate is only used if it matches `^[A-Za-z0-9._@+-]+$` and
does not contain the `..` sequence; otherwise the chain falls through to
the next claim. Because this check applies to every candidate (including
`sub`), the function returns an empty string when no claim yields a
usable, path-safe value — even if other claims are present. This guards
the downstream URL-path usage described in
[Downstream coupling](#downstream-coupling-username-as-gitlab-namespace).

### `resolveOAuthProfileUrl(profile)`

Looks for `profile` then `html_url` (GitHub). It runs the candidate
through `isSafeExternalUrl()` before returning — a security check that
rejects anything that is not `http:` or `https:`, preventing XSS via
`javascript:` or `data:` URLs injected into the `href` of the profile
link. Returns `undefined` rather than an unsafe URL.

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
- **`getUsernameFromProfileUrl`** — parses the value with `new URL()` and
  returns the last `pathname` segment, falling back to a relative-path
  parse when it is not an absolute URL
- **`isSafeExternalUrl`** — uses `new URL()` for parsing (no regex),
  allows only `http:` and `https:`
- **`isSafeUsername`** — restricts a resolved username to a URL-path-safe
  charset and rejects `..`, so an unsafe claim is skipped
- **`firstDefinedValue`** — walks an array and returns the first
  non-undefined entry; used by `resolveOAuthProfileUrl`

All six are unexported. The module's public surface is exactly the two
`resolve*` functions (`resolveOAuthUsername`, `resolveOAuthProfileUrl`).

## Downstream coupling: username as GitLab namespace

Although the resolver is provider-agnostic, the resolved username is not
just a display string. It is persisted to `sessionStorage` and Redux and
then consumed by the GitLab backend layer as a **namespace**, interpolated
unencoded into URL paths such as:

```text
${authority}/${group}/${username}/-/raw/${branch}/...
```

(`model/backend/digitalTwin.ts`, `model/backend/libraryAsset.ts`, and the
workbench/service links in `util/envUtil.ts` and `route/workbench`).

Two consequences follow:

1. **Security** — because the value lands unencoded in a URL path, it is
   validated by `isSafeUsername` at the single resolution chokepoint so a
   crafted claim cannot inject path separators or `..` traversal. The input
   is a signed OIDC token and GitLab enforces authorization server-side, so
   this is defense-in-depth rather than a fix for an exploitable hole.
2. **Operational** — for a non-GitLab provider (Keycloak, Dex, GitHub), the
   resolved username must match an existing GitLab account, or sign-in
   succeeds while every GitLab-backed request fails. The client is provider-
   agnostic; the backend identity model is still GitLab. Keep provider
   usernames aligned with GitLab usernames.

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
