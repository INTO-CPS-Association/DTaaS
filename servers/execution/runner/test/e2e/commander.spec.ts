import { jest } from '@jest/globals';
import CLI, { createCommand } from 'src/config/commander';
import Keyv from 'keyv';

describe('Commander functionality', () => {

  it('Should invoke commander correctly', async () => {
    const [program, CLIOptionsExp] = createCommand('runner');
    const argvCall = jest.spyOn(program, 'parse');

    await CLI(program, CLIOptionsExp);

    expect(argvCall).toHaveBeenCalled();
    expect(program.opts()).toEqual({
      "config": "runner.yaml"
    });
  });

  it.skip('Should process flags correctly', async () => {
    const [program, CLIOptionsExp] = createCommand('runner');
    jest.mock('process', () => ({
      argv: ['node', 'main.js', '--config', 'runner.yaml.test'],
    }));
    await CLI(program, CLIOptionsExp);

    expect(program.opts()).toEqual({
      "config": "runner.yaml.test"
    });
  });

  it('Should run without any flags', async () => {
    const [program, CLIOptionsExp] = createCommand('runner');
    const CLIOptions = await CLI(program, CLIOptionsExp);
    expect(CLIOptions).toBeInstanceOf(Keyv);
    expect(CLIOptionsExp).toEqual(CLIOptions);
  });
  
});
