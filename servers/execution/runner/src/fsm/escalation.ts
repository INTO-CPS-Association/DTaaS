import { z } from 'zod';
import {
  EscalateBody,
  EscalateReplyDto,
  EscalationData,
  EscalationTrigger,
} from '../dto/escalation.dto.js';
import RecentReplies from './recent-replies.js';
import type StateMachine from './state-machine.js';

// The escalation section of the state machine file: the conditions
// that the runner escalates by itself
export const escalationSchema = z
  .object({
    onFailure: z.boolean().default(false),
    onNoTransition: z.boolean().default(false),
  })
  .strict()
  .prefault({});

export type Escalation = z.infer<typeof escalationSchema>;

export type EscalationListener = (data: EscalationData) => void;

type Detail = Pick<EscalationData, 'event' | 'reason' | 'proposal'>;

const NONE: Escalation = { onFailure: false, onNoTransition: false };

const accepted = (): EscalateReplyDto => ({ status: 'accepted' });

// Tells its listeners when the digital twin escalates to its Manager:
// on the conditions that the state machine file declares, and on
// request
export default class Escalations {
  private flags = NONE;

  // The entry whose events without a transition have been escalated
  private entry = 0;

  private readonly escalated = new Set<string>();

  private readonly replies = new RecentReplies<EscalateReplyDto>();

  private readonly listeners: EscalationListener[] = [];

  on(listener: EscalationListener): void {
    this.listeners.push(listener);
  }

  // A new load starts a new machine, so the record of the old one goes
  declare(flags: Escalation | undefined): void {
    this.flags = flags ?? NONE;
    this.entry = 0;
    this.escalated.clear();
  }

  // The script of the current state failed and no transition follows
  failure(machine: StateMachine): void {
    if (this.flags.onFailure) {
      const reason = `script of state ${machine.state} failed`;
      this.emit('failure', machine, { event: null, reason, proposal: null });
    }
  }

  // A client event had no transition in the current state
  noTransition(machine: StateMachine, event: string): void {
    if (this.flags.onNoTransition && this.firstTime(machine, event)) {
      const reason = `no transition for ${event} in state ${machine.state}`;
      this.emit('no-transition', machine, { event, reason, proposal: null });
    }
  }

  // Every request is the same, so a repeated key gets the stored reply
  // and escalates nothing, even with another body
  request(
    { reason, proposal }: EscalateBody,
    requestKey: string | undefined,
    machine: StateMachine | undefined,
  ): EscalateReplyDto {
    const compute = () => {
      this.emit('request', machine, {
        event: null,
        reason,
        proposal: proposal ?? null,
      });
      return accepted();
    };
    // every request is 'escalate', so the mismatch reply never goes out
    return this.replies.resolve(requestKey, 'escalate', {
      compute,
      mismatch: accepted,
      keep: () => true,
    });
  }

  // Whether the event is new in this entry; nothing escalates before
  // the first transition
  private firstTime(machine: StateMachine, event: string): boolean {
    if (machine.state === undefined) {
      return false;
    }
    if (machine.entry !== this.entry) {
      this.entry = machine.entry;
      this.escalated.clear();
    }
    const first = !this.escalated.has(event);
    this.escalated.add(event);
    return first;
  }

  private emit(
    trigger: EscalationTrigger,
    machine: StateMachine | undefined,
    detail: Detail,
  ): void {
    const data: EscalationData = {
      trigger,
      state: machine?.state ?? null,
      entry: machine?.entry ?? 0,
      ...detail,
    };
    this.listeners.forEach((listener) => listener(data));
  }
}
