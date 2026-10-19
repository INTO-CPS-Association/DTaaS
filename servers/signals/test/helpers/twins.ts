/** A visualisation.json with one MQTT transport and, if given, one InfluxDB one. */
export function visualisationOf(
  topics: string[],
  influx?: { org: string; bucket: string; measurement?: string },
  channel?: string,
): Record<string, unknown> {
  const mqtt = {
    adapter: 'mqtt',
    url: 'ws://broker/ws',
    topics,
    ...(channel ? { channel } : {}),
  };
  const transports: unknown[] = [mqtt];
  if (influx !== undefined) transports.push({ adapter: 'influx', ...influx });
  return { transports };
}

export const PUMP = visualisationOf(
  ['alice/pump/flow', 'alice/pump/pressure'],
  {
    org: 'alice',
    bucket: 'alice',
    measurement: 'pump',
  },
);
