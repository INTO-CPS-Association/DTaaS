// A topic of the naming convention has eight levels. The last two are the
// device and the quantity, which is how the reading table keys a series.
const TOPIC_LEVELS = 8;

export type ReadingKey = { deviceId: string; quantity: string };

/** The device and quantity of a topic, or undefined for another shape. */
export default function readingKeyOf(topic: string): ReadingKey | undefined {
  const levels = topic.split('/');
  if (levels.length !== TOPIC_LEVELS || levels.includes('')) return undefined;
  return { deviceId: levels[6], quantity: levels[7] };
}
