import type {
  DtaasExtension,
  HostServices,
} from '@into-cps-association/dtaas-sdk';
import startExtensions from 'extension/startExtensions';

const kit = (id: string, setup?: DtaasExtension['setup']) =>
  ({ id, name: id, version: '0.1.0', sdk: 1, setup }) as DtaasExtension;

describe('startExtensions', () => {
  const hostOf = (ext: DtaasExtension) =>
    ({ logger: ext.id }) as unknown as HostServices;

  it('calls setup of every extension once, with its own services', async () => {
    const setup = jest.fn();

    await startExtensions([kit('wind', setup), kit('pump')], hostOf);

    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith({ logger: 'wind' });
  });

  it('reports a setup that fails and still sets up the others', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const later = jest.fn();
    const failing = kit('wind', async () => {
      throw new Error('no turbines');
    });

    await startExtensions([failing, kit('pump', later)], hostOf);

    expect(warn).toHaveBeenCalledWith(
      'Extension wind failed to set up:',
      expect.objectContaining({ message: 'no turbines' }),
    );
    expect(later).toHaveBeenCalled();
    warn.mockRestore();
  });
});
