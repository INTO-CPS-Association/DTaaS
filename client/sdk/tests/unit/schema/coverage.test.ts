import { matchesTopic } from 'src/schema/coverage';
import { visualisationAssetSchema } from 'src/schema/visualisation.schema';
import junction7 from 'tests/fixtures/junction7.visualisation.json';

const SIGNAL = 'swim/hx1/supply';

/** A building asset fed by one MQTT topic, as the bim migration writes it. */
const building = () => ({
  schemaVersion: '1.0',
  name: 'substation-building',
  layout: { type: 'single', panes: ['building'] },
  substrates: { building: { adapter: 'aec', source: 'substation.glb' } },
  transports: [
    { adapter: 'mqtt', topics: [SIGNAL], channel: 'measured' } as object,
  ],
  anchors: [{ signalPath: SIGNAL, kind: 'ifc-guid', ref: 'abc' }],
  encodings: [
    {
      target: SIGNAL,
      substrate: 'building',
      encoding: {
        type: 'colorScale',
        domain: [4, 16],
        scheme: 'bim.cold-warm',
      } as object,
    } as object,
  ],
});

const issuesOf = (value: unknown) => {
  const result = visualisationAssetSchema.safeParse(value);
  return result.success
    ? []
    : result.error.issues.map((i) => ({ path: i.path, message: i.message }));
};

describe('matchesTopic', () => {
  it.each([
    ['a/b/c', 'a/b/c', true],
    ['a/+/c', 'a/b/c', true],
    ['a/#', 'a/b/c', true],
    ['a/#', 'a', true],
    ['#', 'a/b', true],
    ['a/+', 'a/b/c', false],
    ['a/b/c', 'a/b', false],
    ['a/b', 'a/b/c', false],
    ['a/+/c', 'a/b/d', false],
  ])('filter %j against %j is %s', (filter, path, expected) => {
    expect(matchesTopic(filter, path)).toBe(expected);
  });
});

describe('transport coverage of encodings', () => {
  it('accepts an encoding whose signal an MQTT topic provides', () => {
    expect(issuesOf(building())).toEqual([]);
  });

  it('accepts a signal matched by an MQTT wildcard', () => {
    const asset = building();
    asset.transports = [{ adapter: 'mqtt', topics: ['swim/+/supply'] }];
    expect(issuesOf(asset)).toEqual([]);
  });

  it('names an encoding whose signal no transport provides', () => {
    const asset = building();
    asset.encodings[0] = { ...asset.encodings[0], target: 'swim/hx2/supply' };
    expect(issuesOf(asset)).toEqual([
      {
        path: ['encodings', 0, 'target'],
        message:
          'encodings[0] (colorScale) reads signal "swim/hx2/supply" on channel "measured", which no transport provides',
      },
    ]);
  });

  it('refuses an encoding when the asset declares no transport', () => {
    const asset = building();
    asset.transports = [];
    expect(issuesOf(asset).map((i) => i.path)).toEqual([
      ['encodings', 0, 'target'],
    ]);
  });

  it('refuses a channel that the matching transport does not carry', () => {
    const asset = building();
    asset.encodings[0] = {
      target: SIGNAL,
      substrate: 'building',
      encoding: { type: 'ghost', channel: 'simulated' },
    };
    expect(issuesOf(asset).map((i) => i.path)).toEqual([
      ['encodings', 0, 'encoding', 'channel'],
    ]);
  });

  it('accepts a residual whose channel a file transport provides', () => {
    const asset = building();
    asset.transports.push({
      adapter: 'file',
      url: 'lib://data/simulation.csv',
      channel: 'simulated',
    });
    asset.encodings.push({
      target: SIGNAL,
      substrate: 'building',
      encoding: { type: 'residual', against: 'simulated', domain: [-2, 2] },
    });
    expect(issuesOf(asset)).toEqual([]);
  });

  it('treats a transport without a channel as measured', () => {
    const asset = building();
    asset.transports = [{ adapter: 'influx', org: 'dtaas', bucket: 'b1' }];
    expect(issuesOf(asset)).toEqual([]);
  });

  it('checks the target of a preset binding on any channel', () => {
    const asset = building();
    asset.transports = [
      { adapter: 'mqtt', topics: ['other/topic'], channel: 'predicted' },
    ];
    asset.encodings[0] = {
      target: SIGNAL,
      substrate: 'building',
      preset: 'bim.thermal',
    };
    expect(issuesOf(asset)).toEqual([
      {
        path: ['encodings', 0, 'target'],
        message:
          'encodings[0] (preset "bim.thermal") reads signal "swim/hx1/supply", which no transport provides',
      },
    ]);
  });

  it('accepts the junction-7 example, fed by InfluxDB and a file', () => {
    expect(issuesOf(junction7)).toEqual([]);
  });

  // Declaration D4 of the evaluation: three mistakes in one asset. Only the
  // substrate was reported before the transports were checked.
  it('finds all three mistakes of a declaration with no matching transport', () => {
    const asset = building();
    asset.encodings.push(
      {
        target: SIGNAL,
        substrate: 'no-such-pane',
        encoding: { type: 'label', unit: 'degC' },
      },
      {
        target: 'swim/not/declared/anywhere',
        substrate: 'building',
        encoding: { type: 'colorScale', domain: [0, 1], scheme: 'x' },
      },
      {
        target: SIGNAL,
        substrate: 'building',
        encoding: { type: 'residual', against: 'predicted', domain: [-2, 2] },
      },
    );
    expect(issuesOf(asset)).toEqual([
      {
        path: ['encodings', 1, 'substrate'],
        message: 'Unknown substrate "no-such-pane"',
      },
      {
        path: ['encodings', 2, 'target'],
        message:
          'encodings[2] (colorScale) reads signal "swim/not/declared/anywhere" on channel "measured", which no transport provides',
      },
      {
        path: ['encodings', 3, 'encoding', 'against'],
        message:
          'encodings[3] (residual) reads signal "swim/hx1/supply" on channel "predicted", which no transport provides',
      },
    ]);
  });
});
