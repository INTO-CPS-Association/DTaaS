// The Manager's side of the demo, in one process: a local MQTT broker,
// a subscriber to the notifications of every DT and a webhook receiver.
// Each notification becomes one line of run/mqtt.log or run/webhook.log
// (summary.mjs), marked verified, UNSIGNED or INVALID by jws.mjs. The
// subscriber also keeps each message as it came, with the time it
// arrived, in run/notify.jsonl, from which record.mjs draws the network
// pane of the recording.
import { appendFileSync } from 'node:fs';
import { once } from 'node:events';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'node:net';
import { text } from 'node:stream/consumers';
import { Aedes } from 'aedes';
import { connectAsync } from 'mqtt';
import notice from './summary.mjs';
import { BROKER_PORT, NOTIFY_TOPICS, WEBHOOK_PORT } from './settings.mjs';

function log(file, line) {
  appendFileSync(`run/${file}`, `${line}\n`);
}

async function startBroker() {
  const aedes = await Aedes.createBroker();
  const server = createServer(aedes.handle);
  server.listen(BROKER_PORT, '127.0.0.1');
  await once(server, 'listening');
}

async function startSubscriber() {
  const client = await connectAsync(`mqtt://127.0.0.1:${BROKER_PORT}`, {
    protocolVersion: 4,
  });
  client.on('message', (topic, payload, packet) => {
    if (payload.length > 0) {
      const message = payload.toString();
      const { retain } = packet;
      const record = { at: Date.now(), topic, retain, payload: message };
      log('notify.jsonl', JSON.stringify(record));
      log('mqtt.log', notice(message, topic.split('/')[1]));
    }
  });
  await client.subscribeAsync(NOTIFY_TOPICS, { qos: 1 });
}

async function startWebhook() {
  const server = createHttpServer(async (request, response) => {
    const body = await text(request);
    response.writeHead(204).end();
    log('webhook.log', `POST ${notice(body)}`);
  });
  server.listen(WEBHOOK_PORT, '127.0.0.1');
  await once(server, 'listening');
}

await startBroker();
await startSubscriber();
await startWebhook();
console.log(
  `broker mqtt://127.0.0.1:${BROKER_PORT}, subscribed to ${NOTIFY_TOPICS};` +
    ` webhook http://127.0.0.1:${WEBHOOK_PORT}/dt-events`,
);
