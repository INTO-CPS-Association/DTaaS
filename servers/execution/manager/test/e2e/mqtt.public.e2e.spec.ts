import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { MqttClient } from 'mqtt';
import { Subject } from 'rxjs';
import type { ExecutionRecord } from 'src/digital-twins/interfaces/execution-record.interface.js';
import {
  createFakeDigitalTwinsService,
  execution,
} from '../support/fake-digital-twins-service.js';
import { connectClient, nextMessage } from '../support/mqtt.js';
import { createTestApp } from '../support/test-app.js';

const brokerUrl =
  process.env.EXECUTION_MANAGER_E2E_MQTT_URL ?? 'mqtt://broker.emqx.io:1883';
const prefix = `dtaas-execution-manager-e2e/${randomUUID()}`;
const base = `${prefix}/user1`;

jest.setTimeout(60000);

const changes = new Subject<ExecutionRecord>();
const fakeService = createFakeDigitalTwinsService(changes);

describe(`MQTT API against ${brokerUrl}`, () => {
  let app: INestApplication;
  let client: MqttClient;

  beforeAll(async () => {
    app = await createTestApp(fakeService, {
      url: brokerUrl,
      baseTopic: base,
    });
    client = await connectClient(brokerUrl);
  });

  afterAll(async () => {
    await client?.endAsync(true);
    await app?.close();
  });

  it('lists the digital twins and reports an execution change', async () => {
    fakeService.listDigitalTwins.mockResolvedValue([
      { name: 'hello-world', description: 'Says hello' },
    ]);
    const response = nextMessage(
      client,
      `${base}/responses/list-digital-twins`,
    );
    const event = nextMessage(
      client,
      `${base}/digital-twins/hello-world/executions/e-1`,
    );

    // The service subscribes when its connection is up; retry until answered.
    const answered = await Promise.race([
      response,
      (async () => {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await client.publishAsync(
            `${base}/requests/list-digital-twins`,
            JSON.stringify({ correlationId: `c-${attempt}` }),
            { qos: 1 },
          );
          await new Promise((resolve) => {
            setTimeout(resolve, 1000);
          });
        }
        return undefined;
      })(),
    ]);
    changes.next(execution);

    expect(answered?.body).toMatchObject({
      ok: true,
      data: [{ name: 'hello-world', description: 'Says hello' }],
    });
    expect((await event).body).toEqual(execution);
  });
});
