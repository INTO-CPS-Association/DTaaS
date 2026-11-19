import { extension as kit } from '@into-cps-association/bim-kit/dtaas';
import { validateExtension } from '@into-cps-association/dtaas-sdk';
import extension, { AEC_SUBSTRATE } from 'src/index';

describe('the bim extension', () => {
  it('keeps the page, the menu item and the domain of bim-kit', () => {
    expect(extension.id).toBe('bim');
    expect(extension.routes).toBe(kit.routes);
    expect(extension.navigation).toBe(kit.navigation);
    expect(extension.visualisation?.anchorKinds).toBe(
      kit.visualisation?.anchorKinds,
    );
  });

  it('contributes the aec substrate for the ifc-guid anchor', () => {
    expect(extension.visualisation?.substrates).toEqual([AEC_SUBSTRATE]);
    expect(AEC_SUBSTRATE.supports).toEqual(['ifc-guid']);
  });

  it('passes the contract, with its presets on its own aec substrate', () => {
    expect(validateExtension(extension)).toEqual({ valid: true, errors: [] });
    expect(validateExtension(kit).errors).toEqual([
      'visualisation.presets[0] "bim.temperature": unknown substrate "aec"',
    ]);
  });

  it('loads the substrate code only when asked', async () => {
    const { default: createAecSubstrate } = await AEC_SUBSTRATE.load();

    expect(typeof createAecSubstrate).toBe('function');
  });
});
