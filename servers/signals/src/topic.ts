// The MQTT wildcards ('+', '#') and '*'. A '*' is a plain character in MQTT
// but a wildcard in an AMQP binding, which is left for later, so it is
// refused now and a declared topic stays valid if AMQP is added.
const WILDCARDS = /[+#*]/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

// RabbitMQ turns each '/' of an MQTT topic into a '.' of the routing key, so
// a '.' inside a level would split it in two. A level that starts with '$'
// is reserved by the broker. dtaas-services refuses both for the same reason.
const DOT = /\./;

function hasPlainLevels(topic: string): boolean {
  return topic
    .split('/')
    .every((level) => level.length > 0 && !level.startsWith('$'));
}

/**
 * A topic that names one signal: no wildcard, no control character, no '.'
 * and no empty or '$' level.
 */
export default function isPlainTopic(
  topic: string,
  maxLength: number,
): boolean {
  return (
    topic.length > 0 &&
    topic.length <= maxLength &&
    !WILDCARDS.test(topic) &&
    !CONTROL_CHARACTERS.test(topic) &&
    !DOT.test(topic) &&
    hasPlainLevels(topic)
  );
}
