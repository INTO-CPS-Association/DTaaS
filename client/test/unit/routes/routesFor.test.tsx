import { routesFor } from 'routes';
import { menuItemsFor } from 'page/MenuItems';
import { Profile, PROFILE_NAMES } from 'util/profile';

const FULL_PATHS = [
  '/',
  'config/developer',
  'config/user',
  'library',
  'digitaltwins',
  'automation',
  'bim',
  'account',
  'workbench',
  'preview/digitaltwins',
  'preview/library',
  'insights/measure',
  'insights',
  'insights/config',
  'insights/developer',
  'insights/log',
  '*',
];

const paths = (profile: Profile) => routesFor(profile).map((r) => r.path);

describe('routesFor', () => {
  it('keeps every route, in order, in the full profile', () => {
    expect(paths('full')).toEqual(FULL_PATHS);
  });

  it('keeps the public routes and the workbench in the workbench profile', () => {
    expect(paths('workbench')).toEqual([
      '/',
      'config/developer',
      'config/user',
      'workbench',
      '*',
    ]);
  });

  // The catch-all has to stay last, or it would answer for the routes after it.
  it.each(PROFILE_NAMES)('ends with the catch-all in %s', (profile) => {
    const routePaths = paths(profile);
    expect(routePaths[routePaths.length - 1]).toBe('*');
  });

  it.each(PROFILE_NAMES)(
    'has a route for every drawer link in %s',
    (profile) => {
      const routePaths = paths(profile);
      menuItemsFor(profile).forEach((item) => {
        expect(routePaths).toContain(item.link.slice(1));
      });
    },
  );

  it('returns plain route objects without the feature tag', () => {
    routesFor('full').forEach((route) => {
      expect(Object.keys(route).sort()).toEqual(['element', 'path']);
    });
  });

  // The router takes the list the bundle builds when it loads, so that list
  // has to follow the configured profile.
  it('builds the default route list for the configured profile', () => {
    const original = globalThis.env.REACT_APP_PROFILE;
    globalThis.env.REACT_APP_PROFILE = 'workbench';
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: routes } = require('routes');
      expect(routes.map((r: { path: string }) => r.path)).toEqual(
        paths('workbench'),
      );
    });
    globalThis.env.REACT_APP_PROFILE = original;
  });
});
