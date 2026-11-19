import validateExtension from 'src/extension/validateExtension';
import { type LooseExtension, looseExtension } from 'tests/fixtures/extensions';

const errorsOf = (mutate: (ext: LooseExtension) => void) => {
  const ext = looseExtension();
  mutate(ext);
  return validateExtension(ext).errors;
};

describe('list items', () => {
  it.each([null, 'x', 5])('rejects the navigation item %p', (item) => {
    expect(
      errorsOf((e) => {
        e.navigation = [item];
      }),
    ).toEqual(['navigation[0] must be an object']);
  });

  it('reports each non-object item once, with its own index', () => {
    expect(
      errorsOf((e) => {
        e.visualisation.scopes = [e.visualisation.scopes[0], 'x', null];
      }),
    ).toEqual([
      'visualisation.scopes[1] must be an object',
      'visualisation.scopes[2] must be an object',
    ]);
  });

  it('does not invent an unknown substrate for a null preset', () => {
    expect(
      errorsOf((e) => {
        e.visualisation.presets = [null];
      }),
    ).toEqual(['visualisation.presets[0] must be an object']);
  });
});

describe('required fields', () => {
  it.each([
    [
      'routes',
      (e: LooseExtension) => {
        e.routes[0].path = 5;
      },
      'routes[0] "5": path must be a string',
    ],
    [
      'navigation label',
      (e: LooseExtension) => {
        delete e.navigation[0].label;
      },
      'navigation[0] "/demo": label must be a string',
    ],
    [
      'navigation path',
      (e: LooseExtension) => {
        delete e.navigation[0].path;
      },
      'navigation[0] "": path must be a string',
    ],
    [
      'tab applies',
      (e: LooseExtension) => {
        delete e.digitalTwinTabs[0].applies;
      },
      'digitalTwinTabs[0] "schematic": applies must be a function',
    ],
    [
      'tab label',
      (e: LooseExtension) => {
        e.digitalTwinTabs[0].label = 1;
      },
      'digitalTwinTabs[0] "schematic": label must be a string',
    ],
    [
      'preview id',
      (e: LooseExtension) => {
        delete e.assetPreviews[0].id;
      },
      'assetPreviews[0] "": id must be a string',
    ],
    [
      'anchor resolve',
      (e: LooseExtension) => {
        delete e.visualisation.anchorKinds[0].resolve;
      },
      'visualisation.anchorKinds[0] "demo-node": resolve must be a function',
    ],
    [
      'anchor substrates',
      (e: LooseExtension) => {
        e.visualisation.anchorKinds[0].substrates = 'pid';
      },
      'visualisation.anchorKinds[0] "demo-node": substrates must be an array',
    ],
    [
      'converter from',
      (e: LooseExtension) => {
        e.visualisation.converters[0].from = '.inp';
      },
      'visualisation.converters[0] "inp-to-graph": from must be an array',
    ],
    [
      'converter to',
      (e: LooseExtension) => {
        delete e.visualisation.converters[0].to;
      },
      'visualisation.converters[0] "inp-to-graph": to must be a string',
    ],
    [
      'scope group',
      (e: LooseExtension) => {
        delete e.visualisation.scopes[0].group;
      },
      'visualisation.scopes[0] "zone": group must be a function',
    ],
    [
      'substrate supports',
      (e: LooseExtension) => {
        delete e.visualisation.substrates[0].supports;
      },
      'visualisation.substrates[0] "pid": supports must be an array',
    ],
  ])('checks %s', (_, mutate, message) => {
    expect(errorsOf(mutate)).toContain(message);
  });
});

describe('exotic input', () => {
  it('reports instead of throwing when a value cannot be read', () => {
    const ext = looseExtension();
    Object.defineProperty(ext, 'routes', {
      get: () => {
        throw new Error('trap');
      },
    });
    expect(validateExtension(ext)).toEqual({
      valid: false,
      errors: ['extension could not be read: trap'],
    });
  });

  it('reports instead of throwing for an identifier without toString', () => {
    const errors = errorsOf((e) => {
      e.routes[0].path = Object.create(null);
    });
    expect(errors).toContain('routes[0] "[object]": path must be a string');
  });
});
