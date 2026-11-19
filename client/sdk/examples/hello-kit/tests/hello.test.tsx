import { validateExtension } from '@into-cps-association/dtaas-sdk';
import {
  checkConformance,
  fakeHostServices,
} from '@into-cps-association/dtaas-sdk/testing';
import { extension } from '../src/dtaas';

// The two checks every kit keeps: the host accepts the extension and each of
// its pages mounts through the host it is given.
describe('the hello extension', () => {
  it('passes the host validation', () => {
    expect(validateExtension(extension)).toEqual({ valid: true, errors: [] });
  });

  it('mounts its pages through a fake host', async () => {
    const host = fakeHostServices({
      extensionId: 'hello',
      env: { REACT_APP_EXT_HELLO_GREETING: 'Hej' },
    });
    await expect(checkConformance(extension, { host })).resolves.toEqual({
      passed: true,
      errors: [],
    });
  });
});
