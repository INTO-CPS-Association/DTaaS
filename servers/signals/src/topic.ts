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

const COMMAND_NAME = /^[a-z][a-z0-9_]{0,31}$/;
const ACTUATOR_LEVEL = 5;

/**
 * Where a command to the device of an actuator topic goes: the device topic
 * with 'cmd/<command>' in place of the quantity, as the naming convention
 * gives. Only an actuator ('A') topic of eight levels takes a command.
 */
export function commandTopicOf(
  topic: string,
  command: string,
): string | undefined {
  const levels = topic.split('/');
  if (levels.length !== 8 || levels[ACTUATOR_LEVEL] !== 'A') return undefined;
  if (!COMMAND_NAME.test(command)) return undefined;
  return [...levels.slice(0, 7), 'cmd', command].join('/');
}
