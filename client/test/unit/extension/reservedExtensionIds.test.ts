import routes from 'routes';
import extensionHost from 'extension/extensionHost';
import RESERVED_EXTENSION_IDS from 'extension/reservedExtensionIds';

// The reserved ids are a hand-written copy of the first segments of the core
// routes, because the route table imports the extension host and the host
// cannot import it back. This test keeps the copy in step with the table.
function firstSegment(path: string): string {
  return path.split('/').find((segment) => segment.length > 0) ?? '';
}

describe('RESERVED_EXTENSION_IDS', () => {
  const extensionPaths = new Set(extensionHost.routes.map(({ path }) => path));
  const coreSegments = routes
    .map(({ path }) => path)
    .filter((path) => !extensionPaths.has(path))
    .map(firstSegment)
    .filter((segment) => segment !== '' && segment !== '*');

  it.each([...new Set(coreSegments)])(
    'reserves the core route segment %s',
    (segment) => {
      expect(RESERVED_EXTENSION_IDS).toContain(segment);
    },
  );
});
