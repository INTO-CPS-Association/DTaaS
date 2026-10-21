import { describe, expect, it } from '@jest/globals';
import {
  signalsOfVisualisation,
  type TwinContext,
} from 'src/authz/visualisation';
import { PUMP, visualisationOf } from 'test/helpers/twins';

function contextFor(warnings: string[] = []): TwinContext {
  return {
    owner: 'alice',
    twin: 'pump',
    vhost: 'alice',
    orgTemplate: '{owner}',
    bucketTemplate: '{owner}',
    maxPathLength: 64,
    warn: (message) => warnings.push(message),
  };
}

describe('signalsOfVisualisation', () => {
  it('lists each MQTT topic with its owner, vhost and history', () => {
    const targets = signalsOfVisualisation(PUMP, contextFor());
    expect(targets).toEqual([
      {
        path: 'alice/pump/flow',
        owner: 'alice',
        twin: 'pump',
        channel: 'measured',
        vhost: 'alice',
        influx: { org: 'alice', bucket: 'alice', measurement: 'pump' },
      },
      expect.objectContaining({ path: 'alice/pump/pressure' }),
    ]);
  });

  it('keeps the channel the transport names', () => {
    const [target] = signalsOfVisualisation(
      visualisationOf(['a/b'], undefined, 'simulated'),
      contextFor(),
    );
    expect(target.channel).toBe('simulated');
    expect(target.influx).toBeUndefined();
  });

  it("ignores an InfluxDB source that is not the owner's, and says so", () => {
    const warnings: string[] = [];
    const file = visualisationOf(['a/b'], { org: 'bob', bucket: 'bob' });
    const [target] = signalsOfVisualisation(file, contextFor(warnings));
    expect(target.influx).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });

  it('drops wildcard and over-long topics', () => {
    const file = visualisationOf([
      'a/+/c',
      'a/#',
      'a/*',
      'x'.repeat(65),
      'ok/topic',
    ]);
    expect(
      signalsOfVisualisation(file, contextFor()).map((t) => t.path),
    ).toEqual(['ok/topic']);
  });

  it('reads nothing from a file of another shape', () => {
    expect(signalsOfVisualisation('not an object', contextFor())).toEqual([]);
    expect(
      signalsOfVisualisation(
        { transports: [{ adapter: 'stomp' }] },
        contextFor(),
      ),
    ).toEqual([]);
    expect(signalsOfVisualisation({}, contextFor())).toEqual([]);
  });
});
