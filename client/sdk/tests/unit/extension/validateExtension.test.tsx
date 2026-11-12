import validateExtension from 'src/extension/validateExtension';
import { looseExtension, validExtension } from 'tests/fixtures/extensions';

const errorsOf = (value: unknown, reservedIds?: string[]) =>
  validateExtension(value, reservedIds ? { reservedIds } : undefined).errors;

describe('validateExtension', () => {
  it('accepts a valid extension', () => {
    expect(validateExtension(validExtension())).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('accepts an extension with no contributions at all', () => {
    const minimal = { id: 'min', name: 'Minimal', version: '1.0.0', sdk: 1 };
    expect(errorsOf(minimal)).toEqual([]);
  });

  it.each([null, 42, 'bim', []])('reports %p as not an object', (value) => {
    expect(errorsOf(value)).toEqual(['extension must be an object']);
  });

  it('never throws on an empty object', () => {
    expect(errorsOf({})).toEqual([
      'id must be a string matching ^[a-z][a-z0-9-]*$',
      'name must be a non-empty string',
      'version must be a non-empty string',
      'sdk must be 1',
    ]);
  });

  it.each(['Bim', '1bim', 'bim_kit', ''])('rejects the id %p', (id) => {
    expect(errorsOf({ ...looseExtension(), id })).toEqual([
      'id must be a string matching ^[a-z][a-z0-9-]*$',
    ]);
  });

  it('rejects an id reserved by a core route', () => {
    expect(errorsOf({ ...looseExtension(), id: 'library' })).toEqual([
      'id "library" is reserved by the host',
      'navigation[0].path "/demo" must be under "/library"',
    ]);
  });

  it('uses custom reserved ids when given', () => {
    expect(errorsOf({ ...looseExtension(), id: 'library' }, ['demo2'])).toEqual(
      ['navigation[0].path "/demo" must be under "/library"'],
    );
    expect(errorsOf(looseExtension(), ['demo'])).toEqual([
      'id "demo" is reserved by the host',
    ]);
  });

  it('rejects another SDK major', () => {
    expect(errorsOf({ ...looseExtension(), sdk: 2 })).toEqual([
      'sdk must be 1',
    ]);
  });

  it('rejects a contribution list that is not an array', () => {
    expect(errorsOf({ ...looseExtension(), routes: {} })).toEqual([
      'routes must be an array',
    ]);
  });
});
