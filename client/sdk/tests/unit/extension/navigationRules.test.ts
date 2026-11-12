import validateExtension from 'src/extension/validateExtension';
import { looseExtension } from 'tests/fixtures/extensions';

const errorsFor = (id: string, ...paths: string[]) => {
  const ext = looseExtension() as unknown as Record<string, unknown>;
  ext.id = id;
  ext.navigation = paths.map((path) => ({ label: path, path }));
  return validateExtension(ext).errors;
};

describe('navigation rule', () => {
  it('accepts the mount point and paths below it', () => {
    expect(errorsFor('shm', '/shm', '/shm/alarms')).toEqual([]);
  });

  it('accepts a query or hash on the mount point', () => {
    expect(errorsFor('bim', '/bim?dir=projects/a', '/bim#help')).toEqual([]);
  });

  it('rejects a path outside the mount point', () => {
    expect(errorsFor('shm', '/shm', '/bridges')).toEqual([
      'navigation[1].path "/bridges" must be under "/shm"',
    ]);
  });

  it('rejects a path that only shares a string prefix', () => {
    expect(errorsFor('shm', '/shmx')).toEqual([
      'navigation[0].path "/shmx" must be under "/shm"',
    ]);
  });

  it.each([
    '/shm/../admin',
    '/shm/..',
    '/shm/./alarms',
    '/shm/%2e%2e/admin',
    '/shm/%2E%2E/admin',
    '/shm%2f..%2fadmin',
    '/shm/..%5cadmin',
    '/shm\\..\\admin',
    '/shm/.\t./admin',
    '/shm/.\n./admin',
  ])('rejects %s, which could leave the mount point', (path) => {
    expect(errorsFor('shm', path)).toEqual([
      expect.stringContaining('must not contain "." or ".." segments'),
    ]);
  });

  it('accepts dots inside a segment and encoded text in the query', () => {
    expect(
      errorsFor('shm', '/shm/v1.2/a..b', '/shm?dir=a%2Fb/../c', '/shm#..'),
    ).toEqual([]);
  });

  it('leaves a missing path and a bad id to the other rules', () => {
    const ext = looseExtension() as unknown as Record<string, unknown>;
    ext.navigation = [{ label: 'x' }];
    expect(validateExtension(ext).errors).not.toContainEqual(
      expect.stringContaining('must be under'),
    );
  });
});
