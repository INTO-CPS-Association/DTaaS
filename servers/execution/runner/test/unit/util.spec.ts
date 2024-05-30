import path from 'node:path';
import { describe, expect, it } from '@jest/globals';
import resolveFile from 'src/config/util';

describe('Check utils library', () => {
  it('Should correctly resolve absolute path', () => {
    if (process.platform === 'win32') {
      // prettier-ignore
      // eslint-disable-next-line no-useless-escape
      expect(resolveFile('C:\Users\dtaas')).toEqual('C:\Users\dtaas');
    } else {
      expect(resolveFile('/opt/dtaas')).toEqual('/opt/dtaas');
    }
    expect(resolveFile('runner')).toEqual(path.join(process.cwd(), 'runner'));
  });
});
