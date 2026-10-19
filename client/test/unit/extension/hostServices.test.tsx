import { lazy } from 'react';
import { z } from 'zod';
import type { DtaasExtension } from '@into-cps-association/dtaas-sdk';
import {
  createPlatformServices,
  createSharedServices,
  servicesFor,
  type HostStore,
} from 'extension/hostServices';
import createCore from 'viz/createCore';

jest.mock('@gitbeaker/rest', () => ({ Gitlab: jest.fn() }));

const extension: DtaasExtension = {
  id: 'scada',
  name: 'SCADA kit',
  version: '0.1.0',
  sdk: 1,
  routes: [{ path: '', element: lazy(async () => ({ default: () => null })) }],
};

function hostStore(userName = 'User1'): HostStore & { notify: jest.Mock } {
  return {
    getState: () => ({
      auth: { userName },
      settings: { loggingEnabled: true },
    }),
    notify: jest.fn(),
  };
}

beforeEach(() => {
  globalThis.env = {
    ...globalThis.env,
    REACT_APP_URL: 'https://dtaas.example/',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_LIBLINK: '/tools',
  };
});

describe('the shared host services', () => {
  it('gives the signed-in user, cleaned as every address needs it', async () => {
    const services = createPlatformServices(hostStore(' User1 '));

    await expect(services.auth.user()).resolves.toEqual({ username: 'user1' });
  });

  it('refuses to name a user when nobody is signed in', async () => {
    const services = createPlatformServices(hostStore(''));

    await expect(services.auth.user()).rejects.toThrow('No user is signed in');
    await expect(services.library.baseUrl()).rejects.toThrow();
  });

  it('builds the library address and resolves lib:// paths to files', async () => {
    const { library } = createPlatformServices(hostStore());

    await expect(library.baseUrl()).resolves.toBe(
      'https://dtaas.example/user1/tools',
    );
    await expect(library.resolve('lib://common/a b.glb')).resolves.toBe(
      'https://dtaas.example/user1/tools/files/common/a%20b.glb',
    );
    await expect(library.resolve('https://x.example/a')).resolves.toBe(
      'https://x.example/a',
    );
    await expect(library.resolve('ftp://x/a')).rejects.toThrow();
  });

  it('shows a snackbar through the store and reads settings by name', () => {
    const store = hostStore();
    const services = createPlatformServices(store);

    services.ui.snackbar('Saved', 'success');

    expect(store.notify).toHaveBeenCalledWith('Saved', 'success');
    expect(services.settings.get<boolean>('loggingEnabled')).toBe(true);
    expect(services.settings.get('missing')).toBeUndefined();
  });

  it('passes on the signals and visualisations of the core', () => {
    const platform = createPlatformServices(hostStore());
    const core = createCore({}, platform.contents, [], () => {
      throw new Error('no substrate is built here');
    });

    const services = createSharedServices(hostStore(), core);

    expect(services.signals).toBe(core.signals);
    expect(services.viz).toBe(core.viz);
    expect(services.signals.connection.get(['a/b'])).toBe('down');
  });
});

describe('the services of one extension', () => {
  const platform = createPlatformServices(hostStore());
  const shared = createSharedServices(
    hostStore(),
    createCore({}, platform.contents, [], () => {
      throw new Error('no substrate is built here');
    }),
  );

  it('reads only its own env.js keys through its config schema', () => {
    const env = { REACT_APP_EXT_SCADA_URL: 'https://scada.example' };
    const services = servicesFor(extension.id, shared, env);

    expect(services.config(z.object({ url: z.string() }))).toEqual({
      url: 'https://scada.example',
    });
    expect(() => services.config(z.object({ token: z.string() }))).toThrow();
  });

  it('logs with the extension id in front', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    servicesFor(extension.id, shared, {}).logger.warn('slow');

    expect(warn).toHaveBeenCalledWith('[scada]', 'slow');
    warn.mockRestore();
  });
});
