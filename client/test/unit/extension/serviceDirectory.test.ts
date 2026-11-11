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

  it('names services that require each other instead of looping', () => {
    const wind: DtaasExtension = kit('wind', {
      requires: ['grid.lines'],
      provides: [
        {
          id: 'wind.farms',
          create: () => directory.forExtension(wind).get('grid.lines'),
        },
      ],
    });
    const grid: DtaasExtension = kit('grid', {
      requires: ['wind.farms'],
      provides: [
        {
          id: 'grid.lines',
          create: () => directory.forExtension(grid).get('wind.farms'),
        },
      ],
    });
    const directory = createServiceDirectory([wind, grid], hostOf);

    expect(() => directory.forExtension(grid).get('wind.farms')).toThrow(
      'Services require each other: wind.farms -> grid.lines -> wind.farms',
    );
    // A later request still sees the cycle, and not a half-built service.
    expect(() => directory.forExtension(grid).get('wind.farms')).toThrow(
      'Services require each other',
    );
  });

  it('refuses a service no running extension provides', () => {
    const directory = createServiceDirectory([soil], hostOf);

    expect(() => directory.forExtension(soil).get('bim.models')).toThrow(
      'No enabled extension provides bim.models',
    );
  });
});
