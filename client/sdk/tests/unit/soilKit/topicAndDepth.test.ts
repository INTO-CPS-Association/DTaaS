import {
  formatDepth,
  parseDepthRef,
  parseSoilTopic,
} from 'examples/soil-kit/src/core';

const TOPIC =
  'AUSoil/Site1/field/07/P03/S/S-AUSoil-Site1-field-07-P03-VWC-0001/soil_moisture';

describe('parseSoilTopic', () => {
  it('names the eight levels for the soil domain', () => {
    expect(parseSoilTopic(TOPIC)).toEqual({
      project: 'AUSoil',
      site: 'Site1',
      level: 'field',
      plot: '07',
      profile: 'P03',
      deviceType: 'S',
      deviceId: 'S-AUSoil-Site1-field-07-P03-VWC-0001',
      quantity: 'soil_moisture',
    });
  });

  it.each([
    ['seven levels', 'AUSoil/Site1/field/07/P03/S/soil_moisture'],
    ['nine levels', `${TOPIC}/extra`],
    ['an empty level', TOPIC.replace('/07/', '//')],
    ['a dot in a level', TOPIC.replace('P03', 'P0.3')],
    ['a leading slash', `/${TOPIC.slice(TOPIC.indexOf('/') + 1)}`],
  ])('refuses a path with %s', (_, path) => {
    expect(parseSoilTopic(path)).toBeUndefined();
  });
});

describe('parseDepthRef', () => {
  it('reads a profile and a depth range in metres', () => {
    expect(parseDepthRef('P03/0.20-0.40')).toEqual({
      profile: 'P03',
      from: 0.2,
      to: 0.4,
    });
    expect(parseDepthRef('P03/0-1')).toEqual({
      profile: 'P03',
      from: 0,
      to: 1,
    });
  });

  it.each([
    ['no profile', '0.20-0.40'],
    ['an empty profile', '/0.20-0.40'],
    ['a profile with a dot', 'P.3/0.20-0.40'],
    ['a lower depth above the upper one', 'P03/0.40-0.20'],
    ['an empty range', 'P03/0.20-0.20'],
    ['a negative depth', 'P03/-0.20-0.40'],
    ['a unit', 'P03/20cm-40cm'],
    ['one depth only', 'P03/0.20'],
    ['a second slash', 'P03/0.20-0.40/x'],
  ])('refuses a reference with %s', (_, ref) => {
    expect(parseDepthRef(ref)).toBeUndefined();
  });

  it('writes a depth range as a person reads it', () => {
    expect(formatDepth({ profile: 'P03', from: 0.2, to: 0.4 })).toBe(
      '0.20 to 0.40 m',
    );
  });
});
