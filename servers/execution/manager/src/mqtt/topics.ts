const MAX_TOPIC_BYTES = 65535;

function isDiscouraged(codePoint: number): boolean {
  const control = codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
  const nonCharacter =
    (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
    (codePoint & 0xfffe) === 0xfffe;
  return control || nonCharacter;
}

/**
 * Whether a string is a topic name that can be published to (MQTT 3.1.1,
 * sections 1.5.3 and 4.7). Control characters and non-characters are refused
 * too: a broker may close the connection over one, and mosquitto does.
 */
export function isTopicName(topic: string): boolean {
  if (topic.length === 0 || Buffer.byteLength(topic) > MAX_TOPIC_BYTES) {
    return false;
  }
  return [...topic].every(
    (character) =>
      character !== '+' &&
      character !== '#' &&
      !isDiscouraged(character.codePointAt(0) as number),
  );
}

export default class Topics {
  constructor(private readonly base: string) {}

  requests(): string {
    return `${this.base}/requests/+`;
  }

  operationOf(topic: string): string | undefined {
    const requestPrefix = `${this.base}/requests/`;
    if (!topic.startsWith(requestPrefix)) return undefined;
    const operation = topic.slice(requestPrefix.length);
    return operation === '' || operation.includes('/') ? undefined : operation;
  }

  responseRoot(): string {
    return `${this.base}/responses/`;
  }

  response(operation: string): string {
    return `${this.responseRoot()}${operation}`;
  }

  // A request may name only a topic under the responses, so the service never
  // publishes into its request or event topics, or outside its base topic.
  isResponseTopic(topic: string): boolean {
    const root = this.responseRoot();
    return (
      topic.length > root.length && topic.startsWith(root) && isTopicName(topic)
    );
  }

  event(dtName: string, executionId: string): string {
    return `${this.base}/digital-twins/${dtName}/executions/${executionId}`;
  }
}
