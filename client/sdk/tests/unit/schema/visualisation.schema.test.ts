// These tests feed script URLs to the schema to check that it refuses them.
/* eslint-disable no-script-url */
import { MAX_ASSET_BYTES } from 'src/schema/common.schema';
import {
  parseVisualisationAsset,
  readVisualisationAsset,
  visualisationAssetSchema,
} from 'src/schema/visualisation.schema';
import junction7 from 'tests/fixtures/junction7.visualisation.json';

const clone = () => JSON.parse(JSON.stringify(junction7));

const issuePaths = (value: unknown) => {
  const result = visualisationAssetSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.path);
};

describe('visualisationAssetSchema', () => {
  it('accepts the junction-7 example from the report', () => {
    expect(parseVisualisationAsset(junction7).success).toBe(true);
  });

  it('defaults missing transports, anchors and encodings to empty lists', () => {
    const asset = {
      schemaVersion: '1.0',
      name: 'photo-only',
      layout: { type: 'single', panes: ['photo'] },
      substrates: { photo: { adapter: 'image', source: 'lib://p.jpg' } },
    };
    const result = parseVisualisationAsset(asset);
    expect(result.success && result.data.encodings).toEqual([]);
  });

  it('rejects schema version 2.0', () => {
    expect(issuePaths({ ...clone(), schemaVersion: '2.0' })).toEqual([
      ['schemaVersion'],
    ]);
  });

  it('rejects a layout pane without a substrate', () => {
    const asset = clone();
    asset.layout.panes.push('missing');
    expect(issuePaths(asset)).toEqual([['layout', 'panes', 3]]);
  });

  it('rejects an encoding on an unknown substrate', () => {
    const asset = clone();
    asset.encodings[1].substrate = 'nowhere';
    expect(issuePaths(asset)).toEqual([['encodings', 1, 'substrate']]);
  });

  it('rejects an anchor whose homography does not exist', () => {
    const asset = clone();
    asset.anchors[0].homographyId = 'h9';
    expect(issuePaths(asset)).toEqual([['anchors', 0, 'homographyId']]);
  });

  it('accepts a binding that names a preset instead of an encoding', () => {
    const asset = clone();
    asset.encodings[0] = {
      target: 'junction7/armA/queueLen',
      substrate: 'photo',
      preset: 'traffic.queue',
    };
    expect(issuePaths(asset)).toEqual([]);
  });

  it.each([
    ['neither', { target: 't', substrate: 'photo' }],
    [
      'both',
      {
        target: 't',
        substrate: 'photo',
        preset: 'p',
        encoding: { type: 'label' },
      },
    ],
  ])('rejects a binding with %s encoding and preset', (_, binding) => {
    const asset = clone();
    asset.encodings = [binding];
    expect(issuePaths(asset)).toEqual([['encodings', 0]]);
  });

  it('does not treat inherited object keys as substrates', () => {
    const asset = clone();
    asset.layout.panes.push('toString');
    asset.encodings[0].substrate = 'constructor';
    expect(issuePaths(asset)).toEqual([
      ['layout', 'panes', 3],
      ['encodings', 0, 'substrate'],
    ]);
  });

  it('refuses a javascript: URL on an http transport', () => {
    const asset = clone();
    asset.transports.push({ adapter: 'http', url: 'javascript:alert(1)' });
    expect(issuePaths(asset)).toEqual([['transports', 3, 'url']]);
  });

  it('refuses a data: URL as a substrate source', () => {
    const asset = clone();
    asset.substrates.photo.source = 'data:text/html,<script>x</script>';
    expect(issuePaths(asset)).toEqual([['substrates', 'photo', 'source']]);
  });

  it('accepts a name of 2048 characters and refuses one more', () => {
    expect(issuePaths({ ...clone(), name: 'a'.repeat(2048) })).toEqual([]);
    expect(issuePaths({ ...clone(), name: 'a'.repeat(2049) })).toEqual([
      ['name'],
    ]);
  });

  it('refuses more than 1000 anchors', () => {
    const asset = clone();
    const [first] = asset.anchors;
    asset.anchors = Array.from({ length: 1001 }, () => first);
    expect(issuePaths(asset)).toEqual([['anchors']]);
  });

  it('refuses more than 1000 substrates', () => {
    const asset = clone();
    const [first] = Object.values(asset.substrates);
    asset.substrates = Object.fromEntries(
      Array.from({ length: 1001 }, (_, i) => [`s${i}`, first]),
    );
    expect(issuePaths(asset)).toContainEqual(['substrates']);
  });
});

describe('parseVisualisationAsset with a deployment policy', () => {
  const messages = (value: unknown, allowedOrigins: string[]) => {
    const result = parseVisualisationAsset(value, { allowedOrigins });
    return result.success ? [] : result.error.issues.map((i) => i.message);
  };

  it('checks no origin without a policy', () => {
    expect(parseVisualisationAsset(clone()).success).toBe(true);
  });

  it('accepts a transport whose origin the deployment allows', () => {
    expect(messages(clone(), ['wss://rabbitmq.example:15676'])).toEqual([]);
  });

  it('refuses a transport whose origin the deployment does not allow', () => {
    expect(messages(clone(), ['wss://rabbitmq.example'])).toEqual([
      'The origin wss://rabbitmq.example:15676 is not one this deployment allows',
    ]);
  });

  it('allows no network transport with an empty list', () => {
    const result = parseVisualisationAsset(clone(), { allowedOrigins: [] });
    expect(result.error?.issues.map((i) => i.path)).toEqual([
      ['transports', 0, 'url'],
    ]);
  });

  it('compares the origin of an mqtt URL, which URL.origin leaves null', () => {
    const asset = clone();
    asset.transports[0].url = 'mqtt://attacker.example:1883';
    expect(messages(asset, ['mqtt://rabbitmq:1883'])).toEqual([
      'The origin mqtt://attacker.example:1883 is not one this deployment allows',
    ]);
    asset.transports[0].url = 'mqtt://rabbitmq:1883';
    expect(messages(asset, ['mqtt://rabbitmq:1883'])).toEqual([]);
  });

  it('refuses a POST target on another origin', () => {
    const asset = clone();
    asset.transports.push({
      adapter: 'http',
      url: 'https://attacker.example/c',
      method: 'POST',
      intervalMs: 1000,
    });
    expect(messages(asset, ['wss://rabbitmq.example:15676'])).toHaveLength(1);
  });

  it('leaves library and relative paths to the host', () => {
    const asset = clone();
    asset.transports = [{ adapter: 'file', url: 'lib://data/run.csv' }];
    asset.encodings = [];
    expect(messages(asset, [])).toEqual([]);
  });
});

describe('readVisualisationAsset', () => {
  const policy = { allowedOrigins: ['wss://rabbitmq.example:15676'] };
  const messages = (input: string | Uint8Array) => {
    const result = readVisualisationAsset(input, policy);
    return result.success ? [] : result.error.issues.map((i) => i.message);
  };
  const tooLarge = `A visualisation asset may hold at most ${MAX_ASSET_BYTES} bytes`;

  it('reads a JSON text and a byte array', () => {
    const text = JSON.stringify(clone());
    expect(messages(text)).toEqual([]);
    expect(messages(new TextEncoder().encode(text))).toEqual([]);
  });

  it('refuses more bytes than the bound before parsing them', () => {
    const padding = ' '.repeat(MAX_ASSET_BYTES);
    expect(messages(`${JSON.stringify(clone())}${padding}`)).toEqual([
      tooLarge,
    ]);
    expect(messages(new Uint8Array(MAX_ASSET_BYTES + 1))).toEqual([tooLarge]);
  });

  it('counts bytes and not characters', () => {
    const name = 'é'.repeat(MAX_ASSET_BYTES / 2);
    expect(messages(JSON.stringify({ ...clone(), name }))).toEqual([tooLarge]);
  });

  it('refuses a text that is not JSON', () => {
    expect(messages('{ "name": ')).toEqual(['The asset is not valid JSON']);
  });

  it('applies the policy', () => {
    const asset = clone();
    asset.transports[0].url = 'wss://attacker.example/ws';
    expect(messages(JSON.stringify(asset))).toHaveLength(1);
  });
});
