import { Logger } from '@nestjs/common';
import { fsmReply, FsmReplyDto } from '../dto/fsm.dto.js';
import RecentReplies from './recent-replies.js';
import StateMachine from './state-machine.js';

export type Handle = (machine: StateMachine) => FsmReplyDto;

// Moves the machine on an event
export type Move = (machine: StateMachine, event: string) => FsmReplyDto;

// A transition or event request, such as { kind: 'event', name: 'stop' }
export type FsmRequest = { kind: 'transition' | 'event'; name: string };

// Hears each reply that a request computed, with the request
export type AnswerListener = (request: FsmRequest, reply: FsmReplyDto) => void;

// The machine of the service, if it has one, and whether shutdown began
export type Current = { machine: StateMachine | undefined; stopping: boolean };

// Answers the transition and event requests of the state machine
export default class Requests {
  private readonly replies = new RecentReplies<FsmReplyDto>();

  private readonly listeners: AnswerListener[] = [];

  constructor(
    private readonly current: () => Current,
    private readonly logger: Logger,
  ) {}

  onAnswer(listener: AnswerListener): void {
    this.listeners.push(listener);
  }

  // A request to enter the state, answered by handle
  transition(
    state: string,
    requestKey: string | undefined,
    handle: Handle,
  ): FsmReplyDto {
    return this.reply({ kind: 'transition', name: state }, requestKey, handle);
  }

  // A request to raise the event, answered by handle
  event(
    event: string,
    requestKey: string | undefined,
    handle: Handle,
  ): FsmReplyDto {
    return this.reply({ kind: 'event', name: event }, requestKey, handle);
  }

  // A repeated request key gets the reply to its first request, if that
  // was accepted; a refused request changed nothing, so it is checked
  // again. Only a computed reply is signalled.
  private reply(
    request: FsmRequest,
    requestKey: string | undefined,
    handle: Handle,
  ): FsmReplyDto {
    const label = `${request.kind} ${request.name}`;
    return this.replies.resolve(requestKey, label, {
      compute: () => this.answer(request, handle),
      mismatch: () =>
        fsmReply('invalid request key', this.current().machine?.state),
      keep: ({ status }) => status === 'accepted',
    });
  }

  private answer(request: FsmRequest, handle: Handle): FsmReplyDto {
    const reply = this.compute(handle);
    this.listeners.forEach((listener) => listener(request, reply));
    return reply;
  }

  private compute(handle: Handle): FsmReplyDto {
    const { machine, stopping } = this.current();
    if (machine === undefined) {
      return fsmReply('no state machine', undefined);
    }
    if (stopping) {
      return fsmReply('stopping', machine.state);
    }
    return handle(machine);
  }

  // Answers the events that a parameter change raises: the replies go
  // nowhere, so a refused event is logged, and none escalates
  raiseAll(events: string[], move: Move): void {
    events.forEach((event) =>
      logStay(
        this.logger,
        this.answer({ kind: 'event', name: event }, (machine) =>
          move(machine, event),
        ),
        event,
      ),
    );
  }
}

// Logs an event that left the machine where it was; an event without a
// transition is common, so it is logged at debug level
export function logStay(
  logger: Logger,
  { status, state }: FsmReplyDto,
  event: string,
): void {
  if (status !== 'accepted') {
    const level = status === 'no transition' ? 'debug' : 'warn';
    logger[level](`Stayed in state ${state} on ${event}: ${status}`);
  }
}
