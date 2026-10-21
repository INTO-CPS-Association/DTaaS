import { describe, it, expect } from '@jest/globals';
import Config from 'src/config/config.service.js';
import { useConfigFile } from '../support/config-file.js';

function expectDefaults(config: Config): void {
  expect(config.getHostname()).toBe('127.0.0.1');
  expect(config.getPort()).toBe(4004);
  expect(config.getRoutePrefix()).toBe('execution-manager');
}

describe('Config service', () => {
  const useYaml = useConfigFile([
    'EXECUTION_MANAGER_HOSTNAME',
    'EXECUTION_MANAGER_PORT',
    'EXECUTION_MANAGER_ROUTE_PREFIX',
  ]);

  it('returns defaults when no config is provided', () => {
    expectDefaults(new Config());
  });

  it('loads yaml config', async () => {
    await useYaml(
      ['hostname: 127.0.0.1', 'port: 4500', 'route-prefix: /api/manager/'].join(
        '\n',
      ),
    );

    const config = new Config();

    expect(config.getHostname()).toBe('127.0.0.1');
    expect(config.getPort()).toBe(4500);
    expect(config.getRoutePrefix()).toBe('api/manager');
  });

  it('uses env vars to override yaml values', async () => {
    await useYaml(['hostname: 127.0.0.1', 'port: 4500'].join('\n'));
    process.env.EXECUTION_MANAGER_HOSTNAME = '0.0.0.0';
    process.env.EXECUTION_MANAGER_PORT = '4900';
    process.env.EXECUTION_MANAGER_ROUTE_PREFIX = ' manager ';

    const config = new Config();

    expect(config.getHostname()).toBe('0.0.0.0');
    expect(config.getPort()).toBe(4900);
    expect(config.getRoutePrefix()).toBe('manager');
  });

  it('ignores blank env overrides', () => {
    process.env.EXECUTION_MANAGER_CONFIG_PATH = '';
    process.env.EXECUTION_MANAGER_HOSTNAME = '   ';
    process.env.EXECUTION_MANAGER_PORT = '';
    process.env.EXECUTION_MANAGER_ROUTE_PREFIX = '  ';

    expectDefaults(new Config());
  });

  it('serves the routes at the root when the yaml prefix is /', async () => {
    await useYaml('route-prefix: /\n');

    expect(new Config().getRoutePrefix()).toBe('');
  });

  it('rejects an empty yaml prefix, as it does every empty key', async () => {
    await useYaml('route-prefix: ""\n');

    expect(() => new Config()).toThrow(/route-prefix/);
  });

  it('serves the routes at the root when EXECUTION_MANAGER_ROUTE_PREFIX is /', () => {
    process.env.EXECUTION_MANAGER_ROUTE_PREFIX = '/';

    const config = new Config();

    expect(config.getRoutePrefix()).toBe('');
  });

  it('throws when a numeric env value is not a number', () => {
    process.env.EXECUTION_MANAGER_PORT = 'not-a-number';

    expect(() => new Config()).toThrow(
      'EXECUTION_MANAGER_PORT must be a positive integer',
    );
  });

  it('throws when a numeric env value is not positive', () => {
    process.env.EXECUTION_MANAGER_PORT = '0';

    expect(() => new Config()).toThrow(
      'EXECUTION_MANAGER_PORT must be a positive integer',
    );
  });

  it('treats an empty yaml config as defaults', async () => {
    await useYaml('');

    expectDefaults(new Config());
  });

  it('throws when the yaml config holds more than one document', async () => {
    await useYaml('port: 4500\n---\nport: 4600\n');

    expect(() => new Config()).toThrow('must contain a single YAML document');
  });

  it('keeps a custom yaml prefix when loading an explicit path with an env port', async () => {
    const configPath = await useYaml(
      ['port: 4500', 'route-prefix: custom'].join('\n'),
    );
    delete process.env.EXECUTION_MANAGER_CONFIG_PATH;
    process.env.EXECUTION_MANAGER_PORT = '4900';

    const config = new Config();
    config.loadConfig(configPath);

    expect(config.getPort()).toBe(4900);
    expect(config.getRoutePrefix()).toBe('custom');
  });
});
