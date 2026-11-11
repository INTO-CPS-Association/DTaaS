import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Subject } from '../authz/policy.js';
import { SIGNAL_BROKER, type SignalBroker } from '../broker/broker.js';
import Config from '../config/config.service.js';
import type { CommandRequest } from '../dto/requests.js';
import { commandTopicOf } from '../topic.js';

export type CommandAnswer = { status: 'sent'; topic: string };

/** Sends a command the caller already authorised to the device of a twin. */
@Injectable()
export default class CommandService {
  private readonly logger = new Logger(CommandService.name);

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    @Inject(SIGNAL_BROKER) private readonly broker: SignalBroker,
  ) {} // eslint-disable-line no-empty-function

  /** The topic a command goes to, or a 400 for a topic that takes none. */
  topicOf(request: CommandRequest): string {
    const topic = commandTopicOf(request.path, request.command);
    if (topic === undefined) throw new BadRequestException('Invalid request');
    return topic;
  }

  async send(
    subject: Subject,
    topic: string,
    request: CommandRequest,
    clientAddress: string,
  ): Promise<CommandAnswer> {
    // The payload of the naming convention, with the set point as value.
    const body = JSON.stringify({
      value: request.value,
      ts: new Date().toISOString(),
      unit: request.unit,
    });
    await this.publishWithin(topic, body);
    // The audit line says who moved which actuator to what, and from where.
    // JSON.stringify escapes the unit, which is text the caller chose.
    this.logger.log(
      JSON.stringify({
        user: subject.username,
        action: 'command-sent',
        topic,
        value: request.value,
        unit: request.unit,
        address: clientAddress,
      }),
    );
    return { status: 'sent', topic };
  }

  // A connection that is half gone never answers a QoS 1 publication, so
  // the request ends with 504 after command-timeout. A refusal is a 502.
  private async publishWithin(topic: string, body: string): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new GatewayTimeoutException()),
        this.config.get('command-timeout'),
      );
    });
    try {
      await Promise.race([this.broker.publish(topic, body), timeout]);
    } catch (error) {
      if (error instanceof GatewayTimeoutException) throw error;
      throw new BadGatewayException();
    } finally {
      clearTimeout(timer);
    }
  }
}
