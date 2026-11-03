/**
 * Which web origins a `visualisation.json` may load images and embedded pages
 * from.
 *
 * The file is written by any user who can edit a twin, and an embed frames
 * the page it names inside the DTaaS site. So an `http` or `https` source is
 * accepted only on the client's own origin or on an origin the administrator
 * lists in `REACT_APP_VIZ_ALLOWED_ORIGINS`, separated by commas. The list is
 * empty by default. A library file (`lib://`) is resolved before this check
 * and never reaches it.
 */

/** The origins `env.js` lists, each as `new URL` writes it. */
export function allowedOrigins(
  listed: string | undefined = globalThis.env?.REACT_APP_VIZ_ALLOWED_ORIGINS,
): ReadonlySet<string> {
  const origins = (listed ?? '').split(',').flatMap((entry) => {
    if (entry.trim() === '') return [];
    try {
      return [new URL(entry.trim()).origin];
    } catch {
      // An entry that is not an address allows nothing, and the rest stand.
      return [];
    }
  });
  return new Set(origins);
}

/** Throw unless `url` is on the client's origin or an allowed one. */
export function assertAllowedSource(
  url: string,
  allowed: ReadonlySet<string> = allowedOrigins(),
  own: string = globalThis.location.origin,
): void {
  const { origin } = new URL(url);
  if (origin === own || allowed.has(origin)) return;
  throw new Error(
    `${origin} is not an allowed source of images and embedded pages. ` +
      'An administrator can add it to REACT_APP_VIZ_ALLOWED_ORIGINS.',
  );
}
