import type {
  DtaasExtension,
  HostServices,
} from '@into-cps-association/dtaas-sdk';
import createServiceDirectory from 'extension/serviceDirectory';

const kit = (id: string, more: Partial<DtaasExtension> = {}) =>
  ({ id, name: id, version: '0.1.0', sdk: 1, ...more }) as DtaasExtension;

describe('services between extensions', () => {
  const create = jest.fn((host: HostServices) => ({ owner: host.logger }));
  const bim = kit('bim', { provides: [{ id: 'bim.models', create }] });
  const soil = kit('soil', { requires: ['bim.models'] });
  const pump = kit('pump');
  const hostOf = jest.fn(
    (ext: DtaasExtension) => ({ logger: ext.id }) as unknown as HostServices,
  );

  beforeEach(() => jest.clearAllMocks());

  it('builds a service once, with the services of the extension that provides it', () => {
    const directory = createServiceDirectory([bim, soil], hostOf);

    const first = directory.forExtension(soil).get('bim.models');
    const second = directory.forExtension(soil).get('bim.models');

    expect(first).toEqual({ owner: 'bim' });
    expect(second).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
    expect(hostOf).toHaveBeenCalledWith(bim);
  });

  it('refuses a service the extension did not require', () => {
    const directory = createServiceDirectory([bim, pump], hostOf);

    expect(() => directory.forExtension(pump).get('bim.models')).toThrow(
      'Extension pump does not require bim.models',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a service no running extension provides', () => {
    const directory = createServiceDirectory([soil], hostOf);

    expect(() => directory.forExtension(soil).get('bim.models')).toThrow(
      'No enabled extension provides bim.models',
    );
  });
});
