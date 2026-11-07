import { visualisationAssetSchema } from 'src/schema';
import example from 'examples/soil-kit/examples/visualisation.json';

// The gateway serves only the topics of a twin's mqtt transports, so an
// anchor whose topic no transport lists would be refused with 403.
describe('the soil-kit example visualisation', () => {
  it('satisfies the visualisation.json schema', () => {
    expect(visualisationAssetSchema.safeParse(example).success).toBe(true);
  });

  it('declares every anchored topic in an mqtt transport', () => {
    const served = new Set(
      example.transports
        .filter((transport) => transport.adapter === 'mqtt')
        .flatMap((transport) => transport.topics),
    );
    const anchored = example.anchors.map((anchor) => anchor.signalPath);

    expect(anchored.filter((path) => !served.has(path))).toEqual([]);
  });
});
