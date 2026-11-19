import { kitBuildConfig, muiIconsPlugin, sharedGlobalOf } from 'src/deploy';
import { deployedKeyOf, SHARED_MODULES } from 'src/index';

describe('sharedGlobalOf', () => {
  it.each(Object.entries(SHARED_MODULES))(
    'reads %s from DTAAS_SHARED.%s',
    (source, key) => {
      expect(sharedGlobalOf(source)).toBe(`DTAAS_SHARED.${key}`);
    },
  );

  it('reads an MUI component path from the shared root', () => {
    expect(sharedGlobalOf('@mui/material/Button')).toBe(
      'DTAAS_SHARED.muiMaterial.Button',
    );
  });

  it('reads an MUI helper path as the shared root itself', () => {
    expect(sharedGlobalOf('@mui/material/styles')).toBe(
      'DTAAS_SHARED.muiMaterial',
    );
  });

  it.each([
    'three',
    '@mui/icons-material/Add',
    '@mui/material/Button/x',
    './page',
  ])('leaves %s to the bundle', (source) => {
    expect(sharedGlobalOf(source)).toBeUndefined();
  });
});

describe('kitBuildConfig', () => {
  const config = kitBuildConfig({
    id: 'soil-kit',
    entry: 'src/dtaas/index.ts',
  });

  it('builds one classic script registered under the underscored id', () => {
    expect(config.outDir).toBe('dist/deploy/soil-kit');
    expect(config.lib.formats).toEqual(['iife']);
    expect(config.lib.name).toBe('DTAAS_EXTENSIONS.soil_kit');
    expect(config.lib.fileName()).toBe('index.js');
    expect(config.rollupOptions.output.extend).toBe(true);
    expect(config.rollupOptions.output.exports).toBe('named');
  });

  it('keeps shared modules out of the bundle and maps them to globals', () => {
    const { external } = config.rollupOptions;
    const { globals } = config.rollupOptions.output;

    expect(external('react')).toBe(true);
    expect(external('three')).toBe(false);
    expect(globals('react/jsx-runtime')).toBe('DTAAS_SHARED.reactJsxRuntime');
    expect(globals('three')).toBe('three');
  });

  it('takes another output folder', () => {
    expect(
      kitBuildConfig({ id: 'soil', entry: 'x.ts', outDir: 'out' }).outDir,
    ).toBe('out');
  });
});

describe('muiIconsPlugin', () => {
  const { load } = muiIconsPlugin;

  it.each([
    '/app/node_modules/@mui/icons-material/utils/createSvgIcon.mjs',
    'C:\\app\\node_modules\\@mui\\icons-material\\utils\\createSvgIcon.js',
  ])('reads the icon helper %s from the shared root', (id) => {
    expect(load(id)).toContain("import { createSvgIcon } from '@mui/material'");
  });

  it.each([
    '/app/node_modules/@mui/icons-material/Forest.mjs',
    '/kit/src/utils/createSvgIcon.ts',
  ])('leaves %s alone', (id) => {
    expect(load(id)).toBeNull();
  });
});

describe('deployedKeyOf', () => {
  it('turns every hyphen into an underscore', () => {
    expect(deployedKeyOf('wind-farm-kit')).toBe('wind_farm_kit');
  });
});
