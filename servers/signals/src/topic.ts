// The MQTT wildcards ('+', '#') and '*'. A '*' is a plain character in MQTT
// but a wildcard in an AMQP binding, which is left for later, so it is
// refused now and a declared topic stays valid if AMQP is added.
const WILDCARDS = /[+#*]/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/** A topic that names one signal: no wildcard and no control character. */
export default function isPlainTopic(
  topic: string,
  maxLength: number,
): boolean {
  return (
    topic.length > 0 &&
    topic.length <= maxLength &&
    !WILDCARDS.test(topic) &&
    !CONTROL_CHARACTERS.test(topic)
  );
}
