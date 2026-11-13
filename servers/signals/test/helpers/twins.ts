/** A visualisation.json with one MQTT transport. */
export function visualisationOf(
  topics: string[],
  channel?: string,
): Record<string, unknown> {
  const mqtt = {
    adapter: 'mqtt',
    url: 'wss://broker/ws',
    topics,
    ...(channel ? { channel } : {}),
  };
  return { schemaVersion: '1.0', transports: [mqtt] };
}

export const PUMP = visualisationOf(['alice/pump/flow', 'alice/pump/pressure']);
