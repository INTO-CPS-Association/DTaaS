import { describe, expect, it, jest } from '@jest/globals';
import DescriptorService from 'src/descriptor.service';
import { EscalateBody } from 'src/dto/escalation.dto';
import ExecaManager from 'src/execa-manager.service';
import FsmService from 'src/fsm/fsm.service';
import MqttRequestHandler from 'src/mqtt/mqtt-request.handler';
import { mqttRequest } from './mqtt.fixture';

// A handler whose state machine service accepts every escalation
function createHandler() {
  const fsm = {
    escalate: jest.fn((_body: EscalateBody, _requestKey?: string) => ({
      status: 'accepted',
    })),
  };
  const handler = new MqttRequestHandler(
    {} as ExecaManager,
    fsm as unknown as FsmService,
    {} as DescriptorService,
  );
  return { handler, fsm };
}

const json = (body: unknown) => Buffer.from(JSON.stringify(body));

const validationFailed = {
  statusCode: 400,
  message: 'Validation Failed',
  error: 'Bad Request',
};

describe('MQTT request handler escalations', () => {
  it('Should accept an escalation and pass its request key', async () => {
    const { handler, fsm } = createHandler();
    const body = { reason: 'capacity', proposal: { scope: 'multi' } };

    expect(
      await handler.handle('escalate', mqttRequest(json(body), 'key-1')),
    ).toEqual({
      status: 'accepted',
    });
    expect(fsm.escalate).toHaveBeenCalledWith(body, 'key-1');
  });

  it.each([
    ['an empty payload', Buffer.alloc(0)],
    ['a payload that is not JSON', Buffer.from('capacity')],
    ['an empty reason', json({ reason: '' })],
    ['an array as the proposal', json({ reason: 'a', proposal: [] })],
  ])('Should refuse %s', async (_, payload) => {
    const { handler, fsm } = createHandler();

    expect(await handler.handle('escalate', mqttRequest(payload))).toEqual(
      validationFailed,
    );
    expect(fsm.escalate).not.toHaveBeenCalled();
  });

  it('Should refuse an invalid request key', async () => {
    const { handler, fsm } = createHandler();

    const reply = await handler.handle(
      'escalate',
      mqttRequest(json({ reason: 'capacity' }), 'k'.repeat(300)),
    );

    expect(reply).toEqual(validationFailed);
    expect(fsm.escalate).not.toHaveBeenCalled();
  });
});
