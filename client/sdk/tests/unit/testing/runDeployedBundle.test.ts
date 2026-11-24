import { runDeployedBundle } from 'src/testing';

describe('runDeployedBundle', () => {
  it('runs the code with the shared modules and returns what it registered', () => {
    const code = `
      this.DTAAS_EXTENSIONS = this.DTAAS_EXTENSIONS || {};
      this.DTAAS_EXTENSIONS.demo = { extension: { id: DTAAS_SHARED.zod.id } };
    `;
    expect(runDeployedBundle(code, { zod: { id: 'demo' } })).toEqual({
      demo: { extension: { id: 'demo' } },
    });
  });

  it('returns an empty registry for a bundle that registers nothing', () => {
    expect(runDeployedBundle('var unused = 1;', {})).toEqual({});
  });

  it('lets an error of the bundle reach the test', () => {
    expect(() => runDeployedBundle('DTAAS_SHARED.react.missing()', {})).toThrow(
      TypeError,
    );
  });
});
