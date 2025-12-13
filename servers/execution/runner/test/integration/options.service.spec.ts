import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import Config from 'src/config/configuration.service';
import Keyv from 'keyv';
import resolveFile from 'src/config/util';

describe('Check Configuration Service', () => {
  let config: Config;

  beforeEach(() => {
    config = new Config();
  });

  it('Should create a valid config object', async () => {
    expect(config).toBeInstanceOf(Config);
  });

  it('Should have correct default config after creation', async () => {
    expect(config.getPort()).toEqual(5000);
    expect(config.permitCommands()).toHaveLength(0);
    expect(config.getLocation()).toEqual('script');
  });

  it('Should load correct configuration', async () => {
    const CLIOptions = new Keyv();
    await CLIOptions.set('configFile', 'runner.test.yaml');
    const spyOnCLIOptions = jest.spyOn(CLIOptions, 'get');

    await config.loadConfig(CLIOptions);

    expect(config.getPort()).toEqual(5002);
    expect(config.permitCommands()).toHaveLength(1);
    expect(config.permitCommands()).toContain('create');
    expect(config.getLocation()).toEqual(resolveFile('script'));
    expect(spyOnCLIOptions).toHaveBeenCalled();
  });
});
