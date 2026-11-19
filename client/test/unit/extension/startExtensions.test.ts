import type {
  DtaasExtension,
  HostServices,
} from '@into-cps-association/dtaas-sdk';
import startExtensions from 'extension/startExtensions';

const kit = (id: string, setup?: DtaasExtension['setup']) =>
  ({ id, name: id, version: '0.1.0', sdk: 1, setup }) as DtaasExtension;

describe('startExtensions', () => {
  const warn = jest.fn();
  const hostOf = (ext: DtaasExtension) =>
    ({ id: ext.id, logger: { warn } }) as unknown as HostServices;

  beforeEach(() => warn.mockClear());

  it('calls setup of every extension once, with its own services', async () => {
    const setup = jest.fn();

    await startExtensions([kit('wind', setup), kit('pump')], hostOf);

    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(expect.objectContaining({ id: 'wind' }));
  });

  it('reports a setup that fails and still sets up the others', async () => {
    const later = jest.fn();
    const failing = kit('wind', async () => {
      throw new Error('no turbines');
    });

    await startExtensions([failing, kit('pump', later)], hostOf);

    expect(warn).toHaveBeenCalledWith('Setup failed: no turbines');
    expect(later).toHaveBeenCalled();
  });

  it('reports what a setup threw when it is not an error', async () => {
    // A setup written outside the client may reject with a value that is
    // not an error, and the host still has to report it.
    // eslint-disable-next-line prefer-promise-reject-errors
    const failing = kit('wind', () => Promise.reject('offline'));

    await startExtensions([failing], hostOf);

    expect(warn).toHaveBeenCalledWith('Setup failed: offline');
  });
});
