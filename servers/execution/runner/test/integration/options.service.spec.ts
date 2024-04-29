import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import Config from 'src/config/configuration.service';
import Keyv from 'keyv';
import resolveFile from 'src/config/util';

/*
This file tests Config class. It should have been called
"configuration.service.spec.ts". Unfortunately jest does not
detect files with "configuration" in their name.
So the filename has been changed to "options.service.spec.ts."
*/
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
    await CLIOptions.set('configFile', 'runner.yaml');
    const spyOnCLIOptions = jest.spyOn(CLIOptions, 'get');

    await config.loadConfig(CLIOptions);

    expect(config.getPort()).toEqual(5000);
    expect(config.permitCommands()).toHaveLength(1);
    expect(config.permitCommands()).toContain('create');
    expect(config.getLocation()).toEqual(resolveFile('script'));
    expect(spyOnCLIOptions).toBeCalled();
  });
});
