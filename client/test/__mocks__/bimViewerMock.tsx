/**
 * A stand-in for `@into-cps-association/bim-kit/react` in unit tests.
 *
 * The package ships ES modules and this Jest configuration transforms
 * TypeScript only, so an `import` inside a shipped `.js` file stops any suite
 * that reaches it, and every suite loading `routes.tsx` reaches it. The real
 * component also draws with WebGL, which jsdom does not have.
 *
 * What the viewer draws is tested where the viewer is built. What is tested
 * here is that DTaaS routes to it and hands it the right library URL, and the
 * attributes below are what show that.
 */

export function BuildingModels({ libraryUrl }: { libraryUrl?: string }) {
  return <div data-testid="building-models" data-library-url={libraryUrl} />;
}

/**
 * A stand-in for the package's `contentsUrl`, which the geometry upload uses to
 * address the workspace file server. The real one encodes each path segment,
 * and it is tested where the package is built. This is only enough for the
 * upload's own test to have a URL to assert against.
 */
export function contentsUrl(libraryUrl: string, path: string) {
  const root = libraryUrl.endsWith('/') ? libraryUrl : `${libraryUrl}/`;
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${root}api/contents/${encoded}`;
}

export default { BuildingModels, contentsUrl };
