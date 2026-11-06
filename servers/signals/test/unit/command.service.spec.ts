import { describe, expect, it, jest } from '@jest/globals';
import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Logger,
} from '@nestjs/common';
import CommandService from 'src/command/command.service';
import testConfig from 'test/helpers/config';
import FakeBroker from 'test/helpers/fake-broker';

const VALVE = 'SWiM/CTO/plant/01/loop1/A/A-0001/position';
const ALICE = { id: '7', username: 'alice', token: 't' };
const REQUEST = { path: VALVE, command: 'set', value: 40, unit: '%' };

describe('CommandService', () => {
  it('publishes the payload of the convention on the command topic and logs it', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const broker = new FakeBroker();
    const service = new CommandService(testConfig(), broker);
    const topic = service.topicOf(REQUEST);
    await expect(service.send(ALICE, topic, REQUEST)).resolves.toEqual({
      status: 'sent',
      topic: 'SWiM/CTO/plant/01/loop1/A/A-0001/cmd/set',
    });
    const body = JSON.parse(broker.published[0].body);
    expect(body).toMatchObject({ value: 40, unit: '%' });
    expect(Number.isFinite(Date.parse(body.ts))).toBe(true);
    expect(String(log.mock.calls[0][0])).toContain('"action":"command-sent"');
    log.mockRestore();
  });

  it('refuses a path that takes no command', () => {
    const service = new CommandService(testConfig(), new FakeBroker());
    expect(() =>
      service.topicOf({ ...REQUEST, path: 'alice/pump/flow' }),
    ).toThrow(BadRequestException);
  });

  it('answers 502 when the broker cannot take the command', async () => {
    const broker = new FakeBroker();
    broker.publish = async () => {
      throw new Error('broker down');
    };
    const service = new CommandService(testConfig(), broker);
    await expect(
      service.send(ALICE, service.topicOf(REQUEST), REQUEST),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('answers 504 when the broker does not take the command in time', async () => {
    const broker = new FakeBroker();
    broker.publish = () => new Promise(() => undefined);
    const service = new CommandService(
      testConfig({ 'command-timeout': 20 }),
      broker,
    );
    await expect(
      service.send(ALICE, service.topicOf(REQUEST), REQUEST),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);
  });
});
