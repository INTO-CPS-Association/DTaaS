import CLI, { createCommand } from 'src/config/commander';
import Keyv from 'keyv';

describe('Commander functionality', () => {
  it('Should run without any flags', async () => {
    const [program, CLIOptions] = createCommand('runner');
    await CLI(program, CLIOptions);
    expect(CLIOptions).toBeInstanceOf(Keyv);
  });
});
