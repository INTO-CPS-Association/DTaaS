import { render, screen } from '@testing-library/react';
import { z } from 'zod';
import fakeHostServices from 'src/testing/fakeHostServices';

describe('fakeHostServices', () => {
  it('provides a signed-in user by default', async () => {
    const host = fakeHostServices();
    await expect(host.auth.user()).resolves.toEqual({ username: 'user' });
    expect(host.auth.useUser()).toEqual({ username: 'user' });
  });

  it('rejects user() when signed out', async () => {
    const host = fakeHostServices({ user: null });
    await expect(host.auth.user()).rejects.toThrow('Not signed in');
    expect(host.auth.useUser()).toBeNull();
  });

  it('resolves lib:// URLs against the library base URL', async () => {
    const host = fakeHostServices({ baseUrl: 'https://lib.example' });
    await expect(host.library.baseUrl()).resolves.toBe('https://lib.example');
    expect(host.library.useBaseUrl()).toBe('https://lib.example');
    await expect(host.library.resolve('lib://common/a.jpg')).resolves.toBe(
      'https://lib.example/common/a.jpg',
    );
    await expect(host.library.resolve('https://x/y')).resolves.toBe(
      'https://x/y',
    );
    expect(host.library.conventions.visualisationsDirectory).toBe(
      'common/visualisations',
    );
  });

  it('records snackbars and log calls', () => {
    const host = fakeHostServices();
    host.ui.snackbar('Saved', 'success');
    host.logger.debug('d');
    host.logger.info('i', 1);
    host.logger.warn('w');
    host.logger.error('e');
    expect(host.recorded.snackbars).toEqual([
      { message: 'Saved', severity: 'success' },
    ]);
    expect(host.recorded.logs.map((l) => l.level)).toEqual([
      'debug',
      'info',
      'warn',
      'error',
    ]);
    expect(host.recorded.logs[1].args).toEqual(['i', 1]);
  });

  it('renders the page shell with title, description and children', () => {
    const { Page } = fakeHostServices().ui;
    render(
      <Page title="Wind" description="Farms">
        body
      </Page>,
    );
    expect(screen.getByRole('heading', { name: 'Wind' })).toBeInTheDocument();
    expect(screen.getByText('Farms')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('reads settings', () => {
    const host = fakeHostServices({ settings: { theme: 'dark' } });
    expect(host.settings.get<string>('theme')).toBe('dark');
    expect(host.settings.get('missing')).toBeUndefined();
  });

  it("parses the extension's env keys with config()", () => {
    const host = fakeHostServices({
      extensionId: 'wind',
      env: { REACT_APP_EXT_WIND_SCADA_URL: 'https://scada' },
    });
    expect(host.config(z.object({ scadaUrl: z.string() }))).toEqual({
      scadaUrl: 'https://scada',
    });
  });

  it('throws from config() when the env keys are invalid', () => {
    const host = fakeHostServices({ extensionId: 'wind' });
    expect(() => host.config(z.object({ scadaUrl: z.string() }))).toThrow(
      'Invalid configuration for extension "wind"',
    );
  });

  it('records git commits', async () => {
    const host = fakeHostServices();
    await host.git.commit('r', 'main', [], 'msg');
    expect(host.recorded.commits).toHaveLength(1);
  });

  it('lets tests override a service', () => {
    const snackbar = jest.fn();
    const host = fakeHostServices({
      overrides: { ui: { ...fakeHostServices().ui, snackbar } },
    });
    host.ui.snackbar('x', 'info');
    expect(snackbar).toHaveBeenCalledWith('x', 'info');
  });
});
