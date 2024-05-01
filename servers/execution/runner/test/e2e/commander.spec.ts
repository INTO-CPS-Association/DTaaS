import { jest } from '@jest/globals';
import CLI, { createCommand } from 'src/config/commander';
import Keyv from 'keyv';

describe('Commander functionality', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Should invoke commander correctly', async () => {
    const [program, CLIOptionsExp] = createCommand('runner');
    const argvCall = jest.spyOn(program, 'parse');

    await CLI(program, CLIOptionsExp);

    expect(argvCall).toHaveBeenCalled();
    expect(program.opts()).toEqual({
      config: 'runner.yaml',
    });
  });

  it('Should run without any flags', async () => {
    const [program, CLIOptionsExp] = createCommand('runner');
    const CLIOptions = await CLI(program, CLIOptionsExp);
    expect(CLIOptions).toBeInstanceOf(Keyv);
    expect(CLIOptionsExp).toEqual(CLIOptions);
  });

  it('Should process config correctly', async () => {
    const [program, CLIOptionsExp] = createCommand('runner');
    jest.replaceProperty(process, 'argv', [
      'node',
      'main.js',
      '--config',
      'runner.test.yaml',
    ]);
    await CLI(program, CLIOptionsExp);

    expect(program.opts()).toEqual({
      config: 'runner.test.yaml',
    });
  });

  it('Should throw exception of the config file is not found', async () => {
    const [program, CLIOptionsExp] = createCommand('runner');
    jest.replaceProperty(process, 'argv', [
      'node',
      'main.js',
      '--config',
      'runner.test.yaml.nonexistent',
    ]);
    const callCLI = async () => {
      await CLI(program, CLIOptionsExp);
    };
    await expect(callCLI()).rejects.toThrow(Error);
  });
});
