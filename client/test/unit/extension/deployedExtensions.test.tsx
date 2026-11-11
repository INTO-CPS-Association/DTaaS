import { lazy } from 'react';
import type { DtaasExtension } from '@into-cps-association/dtaas-sdk';
import {
  deployedExtensions,
  deployedPaths,
  loadDeployedExtensions,
  loadScript,
  prepareDeployedExtensions,
  provideSharedModules,
  setDeployedExtensions,
} from 'extension/deployedExtensions';

const page = lazy(async () => ({ default: () => null }));

function kit(id: string): DtaasExtension {
  return {
    id,
    name: `${id} kit`,
    version: '0.1.0',
    sdk: 1,
    routes: [{ path: '', element: page }],
  };
}

// A well-formed SHA-384 value: 64 base64 characters after the prefix.
const HASH = `sha384-${'Ab0+/'.repeat(12)}Ab0+`;

const deployedEnv = (list: string) => ({
  REACT_APP_EXTENSIONS_DEPLOYED: list,
});

describe('deployedPaths', () => {
  it('reads nothing when the key is absent or not a string', () => {
    expect(deployedPaths({})).toEqual({ paths: [], problems: [] });
    expect(deployedPaths({ REACT_APP_EXTENSIONS_DEPLOYED: 42 }).paths).toEqual(
      [],
    );
  });

  it('takes the id from the folder of each path, in order', () => {
    const { paths, problems } = deployedPaths(
      deployedEnv(' extensions/soil/index.js, extensions/wind-farm/main.js '),
    );

    expect(paths).toEqual([
      { id: 'soil', path: 'extensions/soil/index.js' },
      { id: 'wind-farm', path: 'extensions/wind-farm/main.js' },
    ]);
    expect(problems).toEqual([]);
  });

  it.each([
    'https://evil.example/kit.js',
    '//evil.example/extensions/soil/index.js',
    '/extensions/soil/index.js',
    'extensions/../env.js',
    'extensions/soil/../../env.js',
    'extensions/Soil/index.js',
    'extensions/soil/index.mjs',
    'lib/soil/index.js',
    'extensions/soil/index.js#',
    'extensions/soil/index.js#sha384-short',
    `extensions/soil/index.js#${HASH}=`,
    `extensions/soil/index.js#${HASH.replace('sha384', 'sha1')}`,
    `extensions/soil/index.js#${HASH} ${HASH}`,
    `extensions/soil/index.js?v=1#${HASH}`,
  ])('refuses %s, which is not a file under extensions/<id>/', (path) => {
    const { paths, problems } = deployedPaths(deployedEnv(path));

    expect(paths).toEqual([]);
    expect(problems).toEqual([
      {
        id: path,
        reason:
          'REACT_APP_EXTENSIONS_DEPLOYED accepts only extensions/<id>/<file>.js, with an optional #sha384-<hash>',
      },
    ]);
  });

  it('keeps the hash an entry ends in, apart from its path', () => {
    const { paths, problems } = deployedPaths(
      deployedEnv(`extensions/soil/index.js#${HASH}`),
    );

    expect(paths).toEqual([
      { id: 'soil', path: 'extensions/soil/index.js', integrity: HASH },
    ]);
    expect(problems).toEqual([]);
  });
});

describe('loadDeployedExtensions', () => {
  const noShare = async () => undefined;

  it('loads nothing and shares nothing without a list', async () => {
    const load = jest.fn();
    const provide = jest.fn();

    const result = await loadDeployedExtensions({}, { load, provide });

    expect(result).toEqual({ extensions: [], problems: [] });
    expect(load).not.toHaveBeenCalled();
    expect(provide).not.toHaveBeenCalled();
  });

  it('shares the modules, then runs each bundle from the client origin', async () => {
    const calls: string[] = [];
    const registry: Record<string, unknown> = {};
    const load = async (url: string) => {
      calls.push(url);
      registry.soil = { extension: kit('soil') };
    };
    const provide = async () => {
      calls.push('provide');
    };

    const result = await loadDeployedExtensions(
      deployedEnv('extensions/soil/index.js'),
      { load, provide, registry: () => registry },
    );

    expect(calls).toEqual(['provide', '/extensions/soil/index.js']);
    expect(result.extensions.map(({ id }) => id)).toEqual(['soil']);
    expect(result.problems).toEqual([]);
  });

  it('passes the listed hash of a bundle to the loader', async () => {
    const load = jest.fn(async () => undefined);
    const registry = { soil: { extension: kit('soil') } };

    await loadDeployedExtensions(
      deployedEnv(`extensions/soil/index.js#${HASH}, extensions/pump/index.js`),
      { load, provide: noShare, registry: () => registry },
    );

    expect(load).toHaveBeenNthCalledWith(1, '/extensions/soil/index.js', HASH);
    expect(load).toHaveBeenNthCalledWith(
      2,
      '/extensions/pump/index.js',
      undefined,
    );
  });

  it('reports what a loader threw when it is not an error', async () => {
    // A loader may reject with a value that is not an error.
    // eslint-disable-next-line prefer-promise-reject-errors
    const load = () => Promise.reject('refused');

    const result = await loadDeployedExtensions(
      deployedEnv('extensions/soil/index.js'),
      { load, provide: noShare },
    );

    expect(result.problems).toEqual([{ id: 'soil', reason: 'refused' }]);
  });

  it('finds an id with a hyphen under its underscored key', async () => {
    const registry = { wind_farm: { extension: kit('wind-farm') } };

    const result = await loadDeployedExtensions(
      deployedEnv('extensions/wind-farm/index.js'),
      { load: noShare, provide: noShare, registry: () => registry },
    );

    expect(result.extensions.map(({ id }) => id)).toEqual(['wind-farm']);
  });

  it('reports a bundle that fails, registers nothing or another id', async () => {
    const registry = { other: { extension: kit('pump') } };
    const load = async (url: string) => {
      if (url.includes('broken')) throw new Error(`${url} could not be loaded`);
    };

    const result = await loadDeployedExtensions(
      deployedEnv(
        'extensions/broken/index.js, extensions/empty/index.js, extensions/other/index.js',
      ),
      { load, provide: noShare, registry: () => registry },
    );

    expect(result.extensions).toEqual([]);
    expect(result.problems).toEqual([
      {
        id: 'broken',
        reason: '/extensions/broken/index.js could not be loaded',
      },
      {
        id: 'empty',
        reason: 'extensions/empty/index.js registered no extension',
      },
      {
        id: 'other',
        reason: 'extensions/other/index.js declares the id pump, not other',
      },
    ]);
  });

  it('reads the global registry by default', async () => {
    const global = globalThis as Record<string, unknown>;
    global.DTAAS_EXTENSIONS = { soil: { extension: kit('soil') } };

    const result = await loadDeployedExtensions(
      deployedEnv('extensions/soil/index.js'),
      { load: noShare, provide: noShare },
    );

    expect(result.extensions.map(({ id }) => id)).toEqual(['soil']);
    delete global.DTAAS_EXTENSIONS;
  });
});

describe('provideSharedModules', () => {
  it('gives every shared key the host copy of its module', async () => {
    const target: Record<string, unknown> = {};

    await provideSharedModules(target);

    const shared = target.DTAAS_SHARED as Record<string, unknown>;
    expect(Object.keys(shared).sort()).toEqual(
      [
        'dtaasSdk',
        'dtaasSdkSchema',
        'muiMaterial',
        'react',
        'reactDom',
        'reactJsxRuntime',
        'reactRouterDom',
        'zod',
      ].sort(),
    );
    expect(shared.react).toEqual(
      expect.objectContaining({ useState: expect.any(Function) }),
    );
  });
});

describe('loadScript', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('adds an ordered script and resolves when it has run', async () => {
    const loaded = loadScript('/extensions/soil/index.js');
    const script = document.head.querySelector('script') as HTMLScriptElement;
    script.onload?.(new Event('load'));

    await expect(loaded).resolves.toBeUndefined();
    expect(script.getAttribute('src')).toBe('/extensions/soil/index.js');
    expect(script.async).toBe(false);
    expect(script.hasAttribute('integrity')).toBe(false);
    expect(script.hasAttribute('crossorigin')).toBe(false);
  });

  it('asks the browser to check the hash when one is given', () => {
    loadScript('/extensions/soil/index.js', HASH).catch(() => undefined);
    const script = document.head.querySelector('script') as HTMLScriptElement;

    expect(script.integrity).toBe(HASH);
    expect(script.crossOrigin).toBe('anonymous');
  });

  it('rejects when the script cannot be fetched', async () => {
    const loaded = loadScript('/extensions/soil/index.js');
    const script = document.head.querySelector('script') as HTMLScriptElement;
    script.onerror?.(new Event('error'));

    await expect(loaded).rejects.toThrow(
      '/extensions/soil/index.js could not be loaded',
    );
  });
});

describe('setDeployedExtensions', () => {
  it('keeps what the start-up loaded for the registry', () => {
    expect(deployedExtensions()).toEqual({ extensions: [], problems: [] });
    const result = { extensions: [kit('soil')], problems: [] };

    setDeployedExtensions(result);

    expect(deployedExtensions()).toBe(result);
    setDeployedExtensions({ extensions: [], problems: [] });
  });
});

describe('prepareDeployedExtensions', () => {
  afterEach(() => setDeployedExtensions({ extensions: [], problems: [] }));

  it('keeps what the loading returned', async () => {
    const result = { extensions: [kit('soil')], problems: [] };

    await prepareDeployedExtensions({}, async () => result);

    expect(deployedExtensions()).toBe(result);
  });

  it('keeps a fault of the loading as one problem and does not reject', async () => {
    const failing = () => Promise.reject(new Error('no shared modules'));

    await expect(
      prepareDeployedExtensions({}, failing),
    ).resolves.toBeUndefined();

    expect(deployedExtensions()).toEqual({
      extensions: [],
      problems: [
        { id: 'REACT_APP_EXTENSIONS_DEPLOYED', reason: 'no shared modules' },
      ],
    });
  });
});
