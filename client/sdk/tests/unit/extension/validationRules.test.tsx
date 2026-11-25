import validateExtension from 'src/extension/validateExtension';
import {
  Eager,
  type LooseExtension,
  looseExtension,
} from 'tests/fixtures/extensions';

const errorsOf = (mutate: (ext: LooseExtension) => void) => {
  const ext = looseExtension();
  mutate(ext);
  return validateExtension(ext).errors;
};

describe('laziness rules', () => {
  it('rejects an eager route element, naming the path', () => {
    expect(
      errorsOf((e) => {
        e.routes[1].element = Eager;
      }),
    ).toEqual(['routes[1] "detail": element must be a React.lazy component']);
  });

  it('rejects an eager digital twin tab element', () => {
    expect(
      errorsOf((e) => {
        e.digitalTwinTabs[0].element = Eager;
      }),
    ).toEqual([
      'digitalTwinTabs[0] "schematic": element must be a React.lazy component',
    ]);
  });

  it('rejects an eager asset preview element', () => {
    expect(
      errorsOf((e) => {
        e.assetPreviews[0].element = Eager;
      }),
    ).toEqual([
      'assetPreviews[0] "inp": element must be a React.lazy component',
    ]);
  });

  it('rejects an eager inspector panel', () => {
    expect(
      errorsOf((e) => {
        e.visualisation.inspectorPanel = Eager;
      }),
    ).toEqual(['visualisation.inspectorPanel must be a React.lazy component']);
  });

  it.each(['converters', 'fieldKernels', 'substrates'])(
    'rejects %s whose load is not a lazy loader',
    (key) => {
      const errors = errorsOf((e) => {
        e.visualisation[key][0].load = {};
      });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(
        new RegExp(
          `^visualisation\\.${key}\\[0\\] ".+": load must be a zero-argument function returning import\\(\\)$`,
        ),
      );
    },
  );
});

describe('uniqueness rules', () => {
  it('rejects duplicate route paths', () => {
    expect(
      errorsOf((e) => {
        e.routes[1].path = '';
      }),
    ).toEqual(['routes: duplicate path ""']);
  });

  it('rejects duplicate navigation paths', () => {
    expect(
      errorsOf((e) => {
        e.navigation.push({ label: 'x', path: '/demo' });
      }),
    ).toEqual(['navigation: duplicate path "/demo"']);
  });

  it.each([
    ['digitalTwinTabs', 'id', (e: LooseExtension) => e.digitalTwinTabs],
    ['assetPreviews', 'id', (e: LooseExtension) => e.assetPreviews],
    [
      'visualisation.anchorKinds',
      'kind',
      (e: LooseExtension) => e.visualisation.anchorKinds,
    ],
    [
      'visualisation.converters',
      'id',
      (e: LooseExtension) => e.visualisation.converters,
    ],
    [
      'visualisation.presets',
      'id',
      (e: LooseExtension) => e.visualisation.presets,
    ],
    [
      'visualisation.scopes',
      'id',
      (e: LooseExtension) => e.visualisation.scopes,
    ],
    [
      'visualisation.fieldKernels',
      'id',
      (e: LooseExtension) => e.visualisation.fieldKernels,
    ],
    [
      'visualisation.substrates',
      'id',
      (e: LooseExtension) => e.visualisation.substrates,
    ],
  ])('rejects duplicate %s %s', (label, key, pick) => {
    const errors = errorsOf((e) => {
      const list = pick(e);
      list.push({ ...list[0] });
    });
    expect(errors).toContain(
      `${label}: duplicate ${key} "${pick(looseExtension())[0][key]}"`,
    );
  });
});

describe('substrate rules', () => {
  it('rejects a kit substrate that reuses a standard id', () => {
    expect(
      errorsOf((e) => {
        e.visualisation.substrates[0].id = 'image';
        e.visualisation.presets[0].substrate = 'image';
      }),
    ).toEqual([
      'visualisation.substrates[0]: "image" is a standard substrate and cannot be replaced',
    ]);
  });

  it('rejects a preset on a substrate nobody provides', () => {
    expect(
      errorsOf((e) => {
        e.visualisation.presets[0].substrate = 'wake';
      }),
    ).toEqual([
      'visualisation.presets[0] "demo.pressure": unknown substrate "wake"',
    ]);
  });

  it('accepts a preset on a standard substrate', () => {
    expect(
      errorsOf((e) => {
        e.visualisation.presets[0].substrate = 'aec';
      }),
    ).toEqual([]);
  });

  it('requires a detect function when visualisation is present', () => {
    expect(
      errorsOf((e) => {
        delete e.visualisation.detect;
      }),
    ).toEqual(['visualisation.detect must be a function']);
  });

  it('rejects a visualisation contribution that is not an object', () => {
    expect(
      errorsOf((e) => {
        e.visualisation = 'yes';
      }),
    ).toEqual(['visualisation must be an object']);
  });
});
