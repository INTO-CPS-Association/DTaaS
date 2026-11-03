import { describe, expect, it } from '@jest/globals';
import AmqpBroker from 'src/broker/amqp.broker';
import BindingTable from 'src/broker/binding-table';
import type { BrokerListener, BrokerMessage } from 'src/broker/broker';
import VhostLink, { QUEUE_PREFIX } from 'src/broker/vhost-link';
import testConfig from 'test/helpers/config';
import { FakeModel } from 'test/helpers/fake-amqp';

function recorder() {
  const messages: BrokerMessage[] = [];
  let downs = 0;
  const listener: BrokerListener = {
    onMessage: (message) => messages.push(message),
    onDown: () => {
      downs += 1;
    },
  };
  return { listener, messages, downs: () => downs };
}

describe('BindingTable', () => {
  it('reports the first listener of a key and the last to leave', () => {
    const table = new BindingTable<string>();
    expect(table.add('k', 'a')).toBe(true);
    expect(table.add('k', 'b')).toBe(false);
    expect(table.remove('k', 'a')).toBe(false);
    expect(table.remove('k', 'x')).toBe(false);
    expect(table.remove('k', 'b')).toBe(true);
    expect(table.isEmpty()).toBe(true);
  });
});

describe('VhostLink', () => {
  function linkWith(model: FakeModel) {
    let gone = 0;
    const link = new VhostLink(
      'alice',
      async () => model.asModel(),
      () => {
        gone += 1;
      },
    );
    return { link, gone: () => gone };
  }

  it('declares an exclusive auto-delete queue and binds each key once', async () => {
    const model = new FakeModel();
    const { link } = linkWith(model);
    const one = recorder();
    const two = recorder();
    await link.add(['a.b'], one.listener);
    await link.add(['a.b', 'a.c'], two.listener);
    expect(model.channel.queue.startsWith(QUEUE_PREFIX)).toBe(true);
    expect(model.channel.operations[0]).toContain('"exclusive":true');
    expect(
      model.channel.operations.filter((op) => op === 'bind amq.topic a.b'),
    ).toHaveLength(1);
    model.channel.deliver('a.b', 'x');
    expect(one.messages).toHaveLength(1);
    expect(two.messages).toHaveLength(1);
  });

  it('unbinds a key when its last stream leaves and closes when none is left', async () => {
    const model = new FakeModel();
    const { link, gone } = linkWith(model);
    const one = recorder();
    const two = recorder();
    await link.add(['a.b'], one.listener);
    await link.add(['a.b'], two.listener);
    await link.remove(['a.b'], one.listener);
    expect(model.channel.bound.has('a.b')).toBe(true);
    await link.remove(['a.b'], two.listener);
    expect(model.channel.bound.has('a.b')).toBe(false);
    expect(model.closed).toBe(true);
    expect(gone()).toBe(1);
  });

  it('tells every stream when the connection drops', async () => {
    const model = new FakeModel();
    const { link, gone } = linkWith(model);
    const one = recorder();
    await link.add(['a.b'], one.listener);
    model.emit('close');
    expect(one.downs()).toBe(1);
    expect(gone()).toBe(1);
    await expect(link.add(['a.b'], one.listener)).rejects.toThrow(/closed/);
  });

  it('treats a cancelled consumer as a dropped connection', async () => {
    const model = new FakeModel();
    const { link } = linkWith(model);
    const one = recorder();
    await link.add(['a.b'], one.listener);
    model.channel.cancel();
    expect(one.downs()).toBe(1);
  });

  it('drops a link whose bind was refused', async () => {
    const model = new FakeModel();
    model.channel.failBind = true;
    const { link, gone } = linkWith(model);
    await expect(link.add(['a.b'], recorder().listener)).rejects.toThrow(
      'ACCESS_REFUSED',
    );
    expect(gone()).toBe(1);
    expect(model.closed).toBe(true);
  });
});

describe('AmqpBroker', () => {
  it('shares one connection per vhost and opens a new one after it closes', async () => {
    const models: FakeModel[] = [];
    const connector = async () => {
      models.push(new FakeModel());
      return models[models.length - 1].asModel();
    };
    const broker = new AmqpBroker(testConfig(), connector);
    const first = await broker.subscribe('alice', ['a.b'], recorder().listener);
    const second = await broker.subscribe(
      'alice',
      ['a.c'],
      recorder().listener,
    );
    await broker.subscribe('bob', ['b.c'], recorder().listener);
    expect(models).toHaveLength(2);
    await first.close();
    await second.close();
    await broker.subscribe('alice', ['a.b'], recorder().listener);
    expect(models).toHaveLength(3);
    await broker.onModuleDestroy();
    expect(models.every((model) => model.closed)).toBe(true);
  });
});
