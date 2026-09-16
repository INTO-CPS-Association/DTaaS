/**
 * Storing a browser-converted model back in the workspace.
 *
 * The viewer converts an IFC file to glTF in the browser when no `.glb` sits
 * beside it, and throws the result away, so opening the same model again
 * converts it again. Writing the `.glb` next to the `.ifc` means the next open
 * loads the file instead, and the conversion happens once.
 *
 * Where the write goes
 * --------------------
 * The models live in the user's workspace, the same place the Library page
 * embeds and the viewer lists through `api/contents`. That workspace is a
 * Jupyter server, so a file is written with the Jupyter Contents API: a PUT to
 * `api/contents/<path>` whose body carries the bytes as base64. The server
 * guards writes with a token it sets as the `_xsrf` cookie and expects echoed
 * in the `X-XSRFToken` header, so the token is read from the cookie and sent
 * back. The session cookie travels because every request here is credentialed,
 * exactly as the reads the viewer already makes are.
 */

import { contentsUrl } from '@into-cps-association/bim-kit/react';

const IFC_SUFFIX = '.ifc';
const GEOMETRY_SUFFIX = '.glb';

/**
 * The path the geometry is written to: the model's own path with `.ifc`
 * replaced by `.glb`, so the two sit side by side and the listing pairs them.
 */
export function geometryPathFor(ifcPath: string): string {
  const lower = ifcPath.toLowerCase();
  const stem = lower.endsWith(IFC_SUFFIX)
    ? ifcPath.slice(0, ifcPath.length - IFC_SUFFIX.length)
    : ifcPath;
  return `${stem}${GEOMETRY_SUFFIX}`;
}

/**
 * The XSRF token the Jupyter server set, or undefined when there is none.
 *
 * The server rejects a write without it, so its absence is worth reporting up
 * front instead of as an opaque failure from the server.
 */
export function readXsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)_xsrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Base64 of the bytes, built in chunks.
 *
 * `btoa` takes a string, and turning a large byte array into one with
 * `String.fromCharCode(...bytes)` spreads every byte as an argument, which
 * overflows the call stack on a real model. The chunk keeps each call small.
 */
export function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += CHUNK) {
    const slice = bytes.subarray(index, index + CHUNK);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

/**
 * Write the geometry beside its model, so it is not reconverted next time.
 *
 * Rejects when the token is missing or the server does not accept the write.
 * The caller treats a rejection as a missed optimisation and not an error: the
 * model already drew from the in-browser conversion, and it will convert again
 * next time instead of loading a file that was never written.
 */
export async function uploadGeometry(
  libraryUrl: string,
  ifcPath: string,
  glb: Uint8Array,
): Promise<void> {
  const token = readXsrfToken();
  if (!token) {
    throw new Error('no XSRF token, so the workspace would reject the write');
  }

  const path = geometryPathFor(ifcPath);
  const url = contentsUrl(libraryUrl, path);
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRFToken': token,
    },
    body: JSON.stringify({
      type: 'file',
      format: 'base64',
      content: toBase64(glb),
    }),
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
}
