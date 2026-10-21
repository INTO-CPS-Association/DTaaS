// MQTT wildcards ('+', '#') and the AMQP topic wildcards ('*', '#'). A '*'
// is a plain character in MQTT, but bound as an AMQP key it would match a
// whole word, so it is refused too.
const WILDCARDS = /[+#*]/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/** A topic that names one signal: no wildcard and no control character. */
export function isPlainTopic(topic: string, maxLength: number): boolean {
  return (
    topic.length > 0 &&
    topic.length <= maxLength &&
    !WILDCARDS.test(topic) &&
    !CONTROL_CHARACTERS.test(topic)
  );
}

/**
 * The AMQP routing key RabbitMQ's MQTT plugin publishes a topic under.
 *
 * The plugin publishes to amq.topic and swaps '/' and '.', so the topic
 * 'a/b.c' arrives with the routing key 'a.b/c'.
 */
export function topicToRoutingKey(topic: string): string {
  return topic.replace(/[./]/g, (separator) => (separator === '/' ? '.' : '/'));
}
