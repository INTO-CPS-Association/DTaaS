import {execa} from 'execa';

export default class Runner {
  command?: string;

  stdin?: string;

  stdout?: string;

  stderr?: string;

  constructor(command: string) {
      this.command = command;
    }

  // eslint-disable-next-line class-methods-use-this
  async run(): Promise<boolean> {
    const {stdout} = await execa('date');
    // eslint-disable-next-line no-console
    console.log(stdout);
    return true;
  }
}

const runner = new Runner('date');
runner.run();