import { lazy } from 'react';
import type { DtaasExtension } from '@into-cps-association/dtaas-sdk';
import {
  deployedExtensions,
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
        'reactDomClient',
        'reactJsxRuntime',
        'reactRouterDom',
        'zod',
      ].sort(),
    );
    expect(shared.react).toEqual(
      expect.objectContaining({ useState: expect.any(Function) }),
    );
    expect(shared.reactDomClient).toEqual(
      expect.objectContaining({ createRoot: expect.any(Function) }),
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
