/**
 * The two checks a link that comes from the deployment's configuration has to
 * pass, and the only class of input they are for.
 *
 * A configured link is a workbench address: `/{user}/lab`, `/preview/library`,
 * or a full URL a deployment chose. Those are frequently paths, so the checks
 * here resolve against this origin.
 *
 * A claim the identity provider fills in is a different class of input and does
 * not belong here. Those go through the resolvers in `util/auth/oauthUserProfile`,
 * which apply their own allowlist to an absolute URL. Keeping one policy per
 * class is what stops a relative value being accepted where an external URL was
 * meant, and the reverse.
 */

/**
 * Whether a configured link is safe to put in an `href`.
 *
 * Only `http` and `https` pass. A `javascript:` or `data:` URL in an `href`
 * runs when the link is followed, and a configured address is written by
 * whoever deployed the application.
 *
 * React blocks `javascript:` in an `href` with a warning, which is a safety
 * net and not a policy. This is the policy.
 */
export function isSafeHttpUrl(url: string | undefined): url is string {
  if (!url) {
    return false;
  }

  try {
    const { protocol } = new URL(url, globalThis.location.href);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    // A URL the parser rejects is not one to hand to the browser either.
    // This also covers a context with no `location` to resolve against, which
    // is why the base is read without an optional chain.
    return false;
  }
}

/**
 * Whether a configured link is a route of this application.
 *
 * Only a path with a single leading slash is one. A full URL is not, even on
 * this host, and neither is a protocol-relative `//host/path`. The distinction
 * matters because the workbench serves its tools from this same origin:
 * `/{user}/lab` is JupyterLab behind the proxy and not a React route, so
 * comparing origins would route it into the application and land on Not Found.
 */
export function isInAppPath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

export default isSafeHttpUrl;
