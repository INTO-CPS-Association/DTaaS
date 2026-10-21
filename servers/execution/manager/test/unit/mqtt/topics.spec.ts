import { describe, expect, it } from '@jest/globals';
import Topics, { isTopicName } from 'src/mqtt/topics.js';

function topicWith(codePoint: number): string {
  return `clients/${String.fromCodePoint(codePoint)}/replies`;
}

describe('isTopicName', () => {
  it.each([
    ['a plain topic', 'clients/7/replies'],
    ['a space', 'client 7/replies'],
    ['a letter outside ASCII', topicWith(0xe6)],
    ['a character outside the basic plane', topicWith(0x1f600)],
    ['a leading slash and an empty level', '/clients//replies'],
    ['a topic under $SYS', '$SYS/replies'],
    ['65535 bytes', 'a'.repeat(65535)],
  ])('accepts %s', (_, topic) => {
    expect(isTopicName(topic)).toBe(true);
  });

  it.each([
    ['an empty string', ''],
    ['the wildcard +', 'clients/+/replies'],
    ['the wildcard #', 'clients/#'],
    ['the null character', topicWith(0x0000)],
    ['a C0 control character', topicWith(0x0001)],
    ['the last C0 control character', topicWith(0x001f)],
    ['the delete character', topicWith(0x007f)],
    ['a C1 control character', topicWith(0x009f)],
    ['a non-character of the basic plane', topicWith(0xfdd0)],
    ['the last code point of the basic plane', topicWith(0xffff)],
    ['a non-character of another plane', topicWith(0x1fffe)],
    ['more than 65535 bytes', 'a'.repeat(65536)],
    [
      'more than 65535 bytes in fewer characters',
      String.fromCodePoint(0xe6).repeat(32768),
    ],
  ])('refuses %s', (_, topic) => {
    expect(isTopicName(topic)).toBe(false);
  });
});

describe('Topics', () => {
  const base = 'dtaas/execution-manager/user1';
  const topics = new Topics(base);

  it('builds the topics under the prefix and the username', () => {
    expect(topics.requests()).toBe(`${base}/requests/+`);
    expect(topics.response('start-execution')).toBe(
      `${base}/responses/start-execution`,
    );
    expect(topics.event('hello-world', 'e-1')).toBe(
      `${base}/digital-twins/hello-world/executions/e-1`,
    );
  });

  it('names the operation of a request topic', () => {
    expect(topics.operationOf(`${base}/requests/list-digital-twins`)).toBe(
      'list-digital-twins',
    );
    expect(topics.operationOf(`${base}/requests/reboot`)).toBe('reboot');
  });

  it.each([
    ['a response topic', `${base}/responses/list-digital-twins`],
    ['a deeper topic', `${base}/requests/a/b`],
    ['a topic without an operation', `${base}/requests/`],
    ['a topic of another user', 'dtaas/execution-manager/user2/requests/x'],
  ])('names no operation for %s', (_, topic) => {
    expect(topics.operationOf(topic)).toBeUndefined();
  });

  it.each([
    ['the default response topic', `${base}/responses/list-digital-twins`],
    ['a deeper topic under the responses', `${base}/responses/clients/7`],
  ])('accepts %s as a response topic', (_, topic) => {
    expect(topics.isResponseTopic(topic)).toBe(true);
  });

  it.each([
    ['the responses themselves', `${base}/responses/`],
    ['a request topic', `${base}/requests/list-digital-twins`],
    ['an event topic', `${base}/digital-twins/hello-world/executions/e-1`],
    ['a topic of another user', 'dtaas/execution-manager/user2/responses/x'],
    ['a wildcard', `${base}/responses/#`],
  ])('refuses %s as a response topic', (_, topic) => {
    expect(topics.isResponseTopic(topic)).toBe(false);
  });
});
