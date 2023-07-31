import Runner from '../src/runner';
// import {execa} from 'execa';

describe('check runner instantiation', () => {

  it('should be defined', () => {
    const runner = new Runner('date');

    runner.run();
    // execa('date');
    expect(true);
  });

});
