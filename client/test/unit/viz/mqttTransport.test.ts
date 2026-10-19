import { EventEmitter } from 'events';
import type { MqttClient } from 'mqtt';
import createMqttTransport from 'viz/mqttTransport';

jest.mock('mqtt', () => ({
  __esModule: true,
  default: { connect: jest.fn() },
}));

function fakeBroker() {
  const client = Object.assign(new EventEmitter(), {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    end: jest.fn(),
  });
  const connect = jest.fn(() => client as unknown as MqttClient);
  const transport = createMqttTransport(
    { url: 'wss://broker.example/ws', username: 'reader', password: 'p' },
    connect,
  );
  return { client, connect, transport };
}

describe('the MQTT transport', () => {
  it('connects with the broker login', () => {
    const { connect } = fakeBroker();

    expect(connect).toHaveBeenCalledWith(
      'wss://broker.example/ws',
      expect.objectContaining({ username: 'reader', password: 'p' }),
    );
  });

  it('subscribes a topic once however many sinks share it', () => {
    const { client, transport } = fakeBroker();
    const first = transport.subscribe(['room/temp'], jest.fn());
    const second = transport.subscribe(['room/temp'], jest.fn());

    expect(client.subscribe).toHaveBeenCalledTimes(1);
    first();
    expect(client.unsubscribe).not.toHaveBeenCalled();
    second();
    expect(client.unsubscribe).toHaveBeenCalledWith('room/temp');
  });

  it('hands each message of a topic to its sinks as a sample', () => {
    const { client, transport } = fakeBroker();
    const sink = jest.fn();
    transport.subscribe(['room/temp'], sink);

    client.emit('message', 'room/temp', Buffer.from('21.5'));
    client.emit('message', 'room/temp', Buffer.from('not a reading'));
    client.emit('message', 'other/topic', Buffer.from('3'));

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toMatchObject({
      signalPath: 'room/temp',
      channel: 'measured',
      value: 21.5,
    });
  });

  it('reports its connection as the client reports it', () => {
    const { client, transport } = fakeBroker();
    const listener = jest.fn();
    const stop = transport.onState(listener);

    expect(transport.state()).toBe('connecting');
    client.emit('connect');
    expect(transport.state()).toBe('live');
    client.emit('offline');
    expect(transport.state()).toBe('down');
    client.emit('reconnect');
    expect(transport.state()).toBe('connecting');
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    client.emit('error', new Error('refused'));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('closes the client', () => {
    const { client, transport } = fakeBroker();

    transport.close();

    expect(client.end).toHaveBeenCalled();
  });
});
