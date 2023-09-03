import { Injectable } from '@nestjs/common';
import CMDRunner from './CMDRunner.js';
import ExecaCMDRunner from './execaCMDRunner.js';

/* eslint-disable no-console */

@Injectable()
export default class AppService {
  private name: string = 'Hello World!';

  private cmd: CMDRunner = new ExecaCMDRunner('date');

  getHello(): string {
    this.cmd.run();
    this.cmd.run().then((value) => {
      console.log('Check the functionality of ExecaCMDRunner:\n');
      console.log(`The return status of date command is: ${value}`);
      const logs: Map<string, string> = this.cmd.checkLogs();
      console.log(`The output of date command is: ${logs.get('stdout')}`);
    });
    
    return this.name;
  }
}
