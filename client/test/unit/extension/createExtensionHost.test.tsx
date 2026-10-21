import { lazy } from 'react';
import { z } from 'zod';
import type { DtaasExtension } from '@into-cps-association/dtaas-sdk';
import createExtensionHost, { mountPath } from 'extension/createExtensionHost';

const page = lazy(async () => ({ default: () => null }));

function kit(id: string, more: Partial<DtaasExtension> = {}): DtaasExtension {
  return {
    id,
    name: `${id} kit`,
    version: '0.1.0',
    sdk: 1,
    routes: [{ path: '', element: page }],
    navigation: [{ label: id, path: `/${id}` }],
    ...more,
  };
}

describe('createExtensionHost', () => {
  it('runs no extension and reports nothing for an empty manifest', () => {
    const host = createExtensionHost([], {});

    expect(host.enabled).toEqual([]);
    expect(host.routes).toEqual([]);
    expect(host.navigation).toEqual([]);
    expect(host.problems).toEqual([]);
  });

  it('mounts the routes of a valid extension under its id', () => {
    const wind = kit('wind', {
      routes: [
        { path: '', element: page },
        { path: 'turbines', element: page },
      ],
    });

    const host = createExtensionHost([wind], {});

    expect(host.enabled).toEqual([wind]);
    expect(host.routes.map((route) => route.path)).toEqual([
      'wind/*',
      'wind/turbines',
    ]);
  });

  it('orders the navigation of all extensions by order', () => {
    const wind = kit('wind', {
      navigation: [{ label: 'Wind', path: '/wind', order: 20 }],
    });
    const pump = kit('pump', {
      navigation: [{ label: 'Pumps', path: '/pump', order: 10 }],
    });

    const host = createExtensionHost([wind, pump], {});

    expect(host.navigation.map((item) => item.label)).toEqual([
      'Pumps',
      'Wind',
    ]);
  });

  it('leaves out a page that is not lazy, with the reason', () => {
    const eager = kit('eager', {
      routes: [{ path: '', element: (() => null) as never }],
    });

    const host = createExtensionHost([eager], {});

    expect(host.enabled).toEqual([]);
    expect(host.problems[0].id).toBe('eager');
    expect(host.problems[0].reason).toMatch(/lazy/i);
  });

  it('refuses an id a core route of this client already uses', () => {
    const host = createExtensionHost([kit('library'), kit('account')], {});

    expect(host.enabled).toEqual([]);
    expect(host.problems.map((problem) => problem.id)).toEqual([
      'library',
      'account',
    ]);
  });

  it('keeps the first of two extensions with the same id', () => {
    const first = kit('wind');
    const second = kit('wind', { name: 'another wind kit' });

    const host = createExtensionHost([first, second], {});

    expect(host.enabled).toEqual([first]);
    expect(host.problems[0].reason).toMatch(/already has this id/);
  });

  it('leaves out an extension the deployment disables in env.js', () => {
    const env = { REACT_APP_EXTENSIONS_DISABLED: 'wind, pump' };

    const host = createExtensionHost([kit('wind'), kit('solar')], env);

    expect(host.enabled.map((ext) => ext.id)).toEqual(['solar']);
    expect(host.problems[0].reason).toMatch(/REACT_APP_EXTENSIONS_DISABLED/);
  });

  it('checks the config of an extension against its own env.js keys', () => {
    const scada = kit('scada', {
      config: { schema: z.object({ url: z.string().url() }) },
    });

    expect(createExtensionHost([scada], {}).enabled).toEqual([]);
    const env = { REACT_APP_EXT_SCADA_URL: 'https://scada.example' };
    expect(createExtensionHost([scada], env).enabled).toEqual([scada]);
  });

  it('refuses a preset id another extension registered first', () => {
    const preset = { id: 'heat', label: 'Heat', substrate: 'aec' };
    const contribution = (presets: unknown[]) =>
      ({ detect: () => false, presets }) as never;
    const first = kit('first', { visualisation: contribution([preset]) });
    const second = kit('second', { visualisation: contribution([preset]) });

    const host = createExtensionHost([first, second], {});

    expect(host.enabled).toEqual([first]);
    expect(host.problems[0].reason).toBe(
      'preset heat is already registered by first',
    );
  });

  it('refuses an anchor kind another extension registered first', () => {
    const anchorKinds = [
      { kind: 'turbine', substrates: ['mesh'], resolve: () => null },
    ];
    const contribution = { detect: () => false, anchorKinds } as never;
    const first = kit('first', { visualisation: contribution });
    const second = kit('second', { visualisation: contribution });

    const host = createExtensionHost([first, second], {});

    expect(host.problems[0].reason).toBe(
      'anchor kind turbine is already registered by first',
    );
  });

  it('refuses an extension that registers a substrate of the core', () => {
    const substrates = [{ id: 'image', supports: [], load: async () => ({}) }];
    const contribution = { detect: () => false, substrates } as never;
    const own = kit('own', { visualisation: contribution });

    const host = createExtensionHost([own], {});

    expect(host.enabled).toEqual([]);
    expect(host.problems).toEqual([
      { id: 'own', reason: expect.stringMatching(/image/) },
    ]);
  });

  it('collects the reducers of the enabled extensions by id', () => {
    const reducer = (state: unknown) => state ?? 0;

    const host = createExtensionHost([kit('wind', { reducer })], {});

    expect(host.reducers).toEqual({ wind: reducer });
  });
});

describe('mountPath', () => {
  it('mounts the root route of an extension at its id and everything under it', () => {
    expect(mountPath('wind', '')).toBe('wind/*');
    expect(mountPath('wind', 'farms/:farm')).toBe('wind/farms/:farm');
  });
});
