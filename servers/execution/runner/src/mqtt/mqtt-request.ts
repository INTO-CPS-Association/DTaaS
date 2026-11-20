import { HttpException } from '@nestjs/common';
import type { IClientPublishOptions, IPublishPacket } from 'mqtt';
import Access from '../auth/access.js';
import { Principal } from '../auth/auth.config.js';
import { REQUEST_KEY } from '../dto/command.dto.js';
import { defaultResponseTopic, isPublishableTopic } from './mqtt.config.js';

// A request as the handler takes it: its plain body, the request key of
// its MQTT 5 user property, and with access control the principal
export type MqttRequest = {
  body: unknown;
  requestKey?: string;
  principal?: Principal;
};

// An empty payload is undefined, like an empty HTTP body, and a payload
// that is not JSON is null, so that only the first gets a default
export function parseJson(payload: Buffer): unknown {
  if (payload.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(payload.toString());
  } catch {
    return null;
  }
}

// MQTT 5 user properties may repeat, so the first value counts
export function requestKey(packet: IPublishPacket): string | undefined {
  const value = packet.properties?.userProperties?.[REQUEST_KEY];
  return Array.isArray(value) ? value[0] : value;
}

export function publishOptions(
  correlationData: Buffer | undefined,
): IClientPublishOptions {
  if (correlationData === undefined) {
    return { qos: 1 };
  }
  return { qos: 1, properties: { correlationData } };
}

// Without access, the payload is the plain body; with it, the payload
// is a JWS of the envelope, which Access verifies or refuses with a 401
export function openRequest(
  packet: IPublishPacket,
  payload: Buffer,
  access?: Access,
): MqttRequest {
  const key = requestKey(packet);
  if (access === undefined) {
    return { body: parseJson(payload), requestKey: key };
  }
  const { principal, body } = access.mqtt(packet.topic, payload);
  return { body, requestKey: key, principal };
}

// Fall back to the default response topic when the requested one can
// not be published to, or would turn the response into a new request
export function responseTopic(
  topic: string,
  packet: IPublishPacket,
  isRequest: (topic: string) => boolean,
): string {
  const requested = packet.properties?.responseTopic;
  if (
    requested === undefined ||
    !isPublishableTopic(requested) ||
    isRequest(requested)
  ) {
    return defaultResponseTopic(topic);
  }
  return requested;
}

// The body of the HTTP reply of a refusal, such as a 401 of openRequest;
// any other error is thrown again
export function refusalBody(error: unknown): object | string {
  if (error instanceof HttpException) {
    return error.getResponse();
  }
  throw error;
}
