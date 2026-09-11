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
    const { protocol } = new URL(url, globalThis.location?.href);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    // A URL the parser rejects is not one to hand to the browser either.
    return false;
  }
}

export default isSafeHttpUrl;
