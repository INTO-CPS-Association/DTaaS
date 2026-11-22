import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  DigitalTwinNotFoundError,
  ExecutionNotFoundError,
  GitlabFailureError,
} from 'src/digital-twins/digital-twins.errors.js';
import { handleRequest } from 'src/mqtt/requests.js';
import Topics from 'src/mqtt/topics.js';
import {
  createFakeDigitalTwinsService,
  execution,
} from '../../support/fake-digital-twins-service.js';

const service = createFakeDigitalTwinsService();

const base = 'dtaas/execution-manager/user1';
const topics = new Topics(base);
const replies = `${base}/responses/clients/7`;

const details = {
  name: 'hello-world',
  description: '',
  fullDescription: '',
  descriptionFiles: [],
  configFiles: [],
  lifecycleFiles: [],
};

function request(fields: Record<string, unknown>): string {
  return JSON.stringify({ correlationId: '42', ...fields });
}

function badRequest(message: string) {
  return {
    correlationId: '42',
    ok: false,
    error: { code: 'bad-request', message },
  };
}

describe('handleRequest', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('the operations', () => {
    it('lists the digital twins', async () => {
      const digitalTwins = [{ name: 'hello-world', description: 'Says hello' }];
      service.listDigitalTwins.mockResolvedValue(digitalTwins);

      const handled = await handleRequest(
        service,
        topics,
        'list-digital-twins',
        request({}),
      );

      expect(handled).toEqual({
        response: { correlationId: '42', ok: true, data: digitalTwins },
        responseTopic: undefined,
      });
    });

    it('reads a digital twin', async () => {
      service.getDigitalTwin.mockResolvedValue(details);

      const handled = await handleRequest(
        service,
        topics,
        'get-digital-twin',
        request({ dtName: 'hello-world' }),
      );

      expect(handled.response).toEqual({
        correlationId: '42',
        ok: true,
        data: details,
      });
      expect(service.getDigitalTwin).toHaveBeenCalledWith('hello-world');
    });

    it('starts an execution with the optional fields', async () => {
      service.startExecution.mockResolvedValue(execution);

      const handled = await handleRequest(
        service,
        topics,
        'start-execution',
        request({
          dtName: 'hello-world',
          runnerTag: 'windows',
          branch: 'main',
        }),
      );

      expect(handled.response).toMatchObject({ ok: true, data: execution });
      expect(service.startExecution).toHaveBeenCalledWith('hello-world', {
        runnerTag: 'windows',
        branch: 'main',
      });
    });

    it('stops an execution', async () => {
      const stopped = { ...execution, status: 'canceled' };
      service.stopExecution.mockResolvedValue(stopped);

      const handled = await handleRequest(
        service,
        topics,
        'stop-execution',
        request({ dtName: 'hello-world', executionId: 'e-1' }),
      );

      expect(handled.response).toMatchObject({ ok: true, data: stopped });
      expect(service.stopExecution).toHaveBeenCalledWith('hello-world', 'e-1');
    });

    it('lists the executions of a digital twin', async () => {
      service.listExecutions.mockResolvedValue([execution]);

      const handled = await handleRequest(
        service,
        topics,
        'list-executions',
        request({ dtName: 'hello-world' }),
      );

      expect(handled.response).toMatchObject({ ok: true, data: [execution] });
      expect(service.listExecutions).toHaveBeenCalledWith('hello-world');
    });

    it('reads an execution', async () => {
      service.getExecution.mockResolvedValue(execution);

      const handled = await handleRequest(
        service,
        topics,
        'get-execution',
        request({ dtName: 'hello-world', executionId: 'e-1' }),
      );

      expect(handled.response).toMatchObject({ ok: true, data: execution });
      expect(service.getExecution).toHaveBeenCalledWith('hello-world', 'e-1');
    });

    it.each(['reboot', 'constructor', 'toString'])(
      'reports %s as an unknown operation',
      async (operation) => {
        const handled = await handleRequest(
          service,
          topics,
          operation,
          request({}),
        );

        expect(handled.response).toEqual({
          correlationId: '42',
          ok: false,
          error: { code: 'unknown-operation', message: 'Unknown operation' },
        });
      },
    );
  });

  describe('the request payload', () => {
    it('reports a payload that is not JSON without a correlation ID', async () => {
      const handled = await handleRequest(
        service,
        topics,
        'list-digital-twins',
        '{',
      );

      expect(handled.response).toEqual({
        correlationId: null,
        ok: false,
        error: { code: 'bad-request', message: 'The payload is not JSON' },
      });
    });

    it('reports a missing field', async () => {
      const handled = await handleRequest(
        service,
        topics,
        'stop-execution',
        request({ dtName: 'hello-world' }),
      );

      expect(handled.response).toMatchObject({
        correlationId: '42',
        ok: false,
        error: { code: 'bad-request' },
      });
      expect(handled.response).toHaveProperty(
        'error.message',
        expect.stringContaining('executionId'),
      );
      expect(service.stopExecution).not.toHaveBeenCalled();
    });

    it('reports a field the operation does not take', async () => {
      const handled = await handleRequest(
        service,
        topics,
        'list-digital-twins',
        request({ executionId: 'e-1' }),
      );

      expect(handled.response).toMatchObject({
        correlationId: '42',
        ok: false,
        error: { code: 'bad-request' },
      });
      expect(service.listDigitalTwins).not.toHaveBeenCalled();
    });

    it('reports an invalid digital twin name with the correlation ID', async () => {
      const handled = await handleRequest(
        service,
        topics,
        'get-digital-twin',
        request({ dtName: 'a/b' }),
      );

      expect(handled.response).toEqual(
        badRequest('dtName: must be a directory name'),
      );
      expect(service.getDigitalTwin).not.toHaveBeenCalled();
    });
  });

  describe('the response topic', () => {
    it('answers on the topic the request names', async () => {
      service.listDigitalTwins.mockResolvedValue([]);

      const handled = await handleRequest(
        service,
        topics,
        'list-digital-twins',
        request({ responseTopic: replies }),
      );

      expect(handled.responseTopic).toBe(replies);
    });

    it('answers an invalid request on the topic it names', async () => {
      const handled = await handleRequest(
        service,
        topics,
        'get-digital-twin',
        request({ responseTopic: replies }),
      );

      expect(handled.responseTopic).toBe(replies);
      expect(handled.response).toMatchObject({
        error: { code: 'bad-request' },
      });
    });

    it.each([
      ['a wildcard', `${base}/responses/#`],
      ['a control character', `${base}/responses/${String.fromCodePoint(1)}`],
      ['no character', ''],
      ['no level below the responses', `${base}/responses/`],
      ['the request topics', `${base}/requests/list-digital-twins`],
      ['the event topics', `${base}/digital-twins/hello-world/executions/e-1`],
      ['another base topic', 'dtaas/execution-manager/user2/responses/x'],
      ['a value that is not a string', 7],
    ])(
      'answers a response topic with %s on the default topic as bad-request',
      async (_, responseTopic) => {
        const handled = await handleRequest(
          service,
          topics,
          'list-digital-twins',
          request({ responseTopic }),
        );

        expect(handled.responseTopic).toBeUndefined();
        expect(handled.response).toEqual(
          badRequest(
            `responseTopic: must be a topic name under ${base}/responses/`,
          ),
        );
        expect(service.listDigitalTwins).not.toHaveBeenCalled();
      },
    );
  });

  describe('errors of the operations', () => {
    it.each([
      ['not-found', new DigitalTwinNotFoundError('nope')],
      ['not-found', new ExecutionNotFoundError('hello-world', 'e-9')],
      ['bad-gateway', new GitlabFailureError('GitLab said no')],
    ])('answers a %s error with its message', async (code, error) => {
      service.getDigitalTwin.mockRejectedValue(error);

      const handled = await handleRequest(
        service,
        topics,
        'get-digital-twin',
        request({ dtName: 'hello-world' }),
      );

      expect(handled).toEqual({
        response: {
          correlationId: '42',
          ok: false,
          error: { code, message: error.message },
        },
        responseTopic: undefined,
      });
    });

    it('hides the message of an unexpected error and hands the error over', async () => {
      const unexpected = new Error('token leaked');
      service.getDigitalTwin.mockRejectedValue(unexpected);

      const handled = await handleRequest(
        service,
        topics,
        'get-digital-twin',
        request({ dtName: 'hello-world' }),
      );

      expect(handled.response).toEqual({
        correlationId: '42',
        ok: false,
        error: {
          code: 'internal',
          message: 'The request could not be handled',
        },
      });
      expect(handled.unexpected).toBe(unexpected);
    });
  });
});
