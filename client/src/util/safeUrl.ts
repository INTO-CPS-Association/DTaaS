/**
 * Whether a URL is safe to put in an `href`.
 *
 * Only `http` and `https` pass. A `javascript:` or `data:` URL in an `href`
 * runs when the link is followed, and the URLs this application renders do not
 * all come from the application: the workbench addresses come from the
 * deployment's configuration and the profile address comes from a claim the
 * identity provider fills in.
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
