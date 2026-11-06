import validateExtension from 'src/extension/validateExtension';
import fakeHostServices from 'src/testing/fakeHostServices';
import { looseExtension } from 'tests/fixtures/extensions';

const create = () => ({ count: () => 3 });

describe('services between extensions (K12)', () => {
  it('accepts a service named after its extension and a list of needs', () => {
    const ext = {
      ...looseExtension(),
      provides: [{ id: `${looseExtension().id}.models`, create }],
      requires: ['soil.profiles'],
    };
    expect(validateExtension(ext).errors).toEqual([]);
  });

  it('refuses a service named after another extension', () => {
    const ext = {
      ...looseExtension(),
      provides: [{ id: 'bim.models', create }],
    };
    expect(validateExtension(ext).errors).toEqual([
      `provides[0] "bim.models": id must start with "${looseExtension().id}."`,
    ]);
  });

  it('refuses a service without a create function', () => {
    const id = `${looseExtension().id}.models`;
    const ext = { ...looseExtension(), provides: [{ id }] };
    expect(validateExtension(ext).errors).toEqual([
      `provides[0] "${id}": create must be a function`,
    ]);
  });

  it.each([['bim.models', 3], 'bim.models', [''], {}])(
    'refuses requires %p',
    (requires) => {
      expect(
        validateExtension({ ...looseExtension(), requires }).errors,
      ).toEqual(['requires must be an array of service ids']);
    },
  );

  it('gives a kit under test the services it is given and no other', () => {
    const models = create();
    const host = fakeHostServices({ services: { 'bim.models': models } });

    expect(host.extensions.get('bim.models')).toBe(models);
    expect(() => host.extensions.get('soil.profiles')).toThrow(
      'No service soil.profiles in this host',
    );
  });
});
