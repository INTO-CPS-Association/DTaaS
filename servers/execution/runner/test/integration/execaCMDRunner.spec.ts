import { describe,it,expect } from "@jest/globals";
import CMDRunner from '../../src/CMDRunner';
import ExecaCMDRunner from '../../src/execaCMDRunner';

describe('check Execa CMD Runner instantiation', () => {

  it('should be defined', async () => {
    const cmdrunner: CMDRunner = new ExecaCMDRunner('date');

    expect(cmdrunner.run()).toBe(true);
  });

});
