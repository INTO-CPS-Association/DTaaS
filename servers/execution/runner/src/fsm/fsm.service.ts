import { BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import Config from '../config/configuration.service.js';
import ExecaManager from '../execa-manager.service.js';
import Queue from '../queue.service.js';
import {
  COMPLETION,
  fsmReply,
  FsmReplyDto,
  FsmStateDto,
  ScriptStatus,
  STATUS,
} from '../dto/fsm.dto.js';
import { EscalateBody, EscalateReplyDto } from '../dto/escalation.dto.js';
import { ParametersBody } from '../dto/parameters.dto.js';
import Changes, { ChangeListener } from '../notify/changes.js';
import { scriptBase } from '../scripts/launch.js';
import { CompletionEvent, Definition, loadDefinition } from './definition.js';
import Escalations, { EscalationListener } from './escalation.js';
import MachineStore from './machine-store.js';
import Parameters from './parameters.js';
import Requests, { AnswerListener, logStay } from './requests.js';
import { Env, RunnerContext } from './script-context.js';
import scriptOutcome from './script-outcome.js';
import StateMachine from './state-machine.js';
import StopChain from './stop-chain.js';
import { known } from './subscriptions.js';

// Moves the digital twin between the states of its state machine, and
// runs the script of each state it enters. A transition request starts
// the machine; events and the completion of scripts move it on.
@Injectable()
export default class FsmService implements BeforeApplicationShutdown {
  private readonly logger = new Logger(FsmService.name);

  private definition: Definition | undefined;

  private machine: StateMachine | undefined;

  private params: Parameters | undefined;

  private status: ScriptStatus = 'none';

  private stopping = false;

  private readonly stops: StopChain;

  // Keeps the machine across restarts
  private readonly store: MachineStore;

  private readonly requests = new Requests(
    () => ({ machine: this.machine, stopping: this.stopping }),
    this.logger,
  );

  // Signals a new state, or a new status of its script
  private readonly changes = new Changes();

  // What the scripts learn about the runner and the digital twin
  private readonly context = new RunnerContext();

  private readonly escalations = new Escalations();

  constructor(
    private readonly manager: ExecaManager,
    private readonly config: Config,
    private readonly queue: Queue,
  ) {
    this.stops = new StopChain(manager);
    this.store = new MachineStore(queue, this.logger);
  }

  load(): void {
    const file = this.config.getStateMachine();
    const definition = loadDefinition(file, known(this.config));
    this.definition = definition;
    this.machine = definition && new StateMachine(definition);
    this.params = definition && new Parameters(definition.parameters);
    this.context.load(this.config.getId(), definition, this.params);
    this.context.inherit(scriptBase(this.config.getScriptUser(), process.env));
    this.escalations.declare(definition?.escalation);
  }

  // Resumes the stored machine; main.ts calls it once the database is
  // open, before any request
  restore(): void {
    const { definition, params } = this;
    const { state, entry, status } = this.store.restore(definition, params);
    this.status = status;
    this.machine = definition && new StateMachine(definition, state, entry);
  }

  // The HTTP API for scripts and its token; undefined leaves either unset
  setRunnerApi(url: string | undefined, token: string | undefined): void {
    this.context.setApi(url, token);
  }

  // The environment of a script of POST /: the machine as it is
  environment(command: string): Env {
    const machine = this.machine;
    return this.context.environment(command, machine?.state, machine?.entry);
  }

  // No transition or completion starts a script once shutdown begins,
  // as the database closes after the scripts that run
  beforeApplicationShutdown(): void {
    this.stopping = true;
  }

  onChange(listener: ChangeListener): void {
    this.changes.on(listener);
  }

  onEscalation(listener: EscalationListener): void {
    this.escalations.on(listener);
  }

  onAnswer(listener: AnswerListener): void {
    this.requests.onAnswer(listener);
  }

  // Needs no state machine, so that a plain DT escalates too
  escalate(body: EscalateBody, requestKey?: string): EscalateReplyDto {
    return this.escalations.request(body, requestKey, this.machine);
  }

  check(): FsmStateDto | undefined {
    return this.machine?.describe(this.status);
  }

  // The state machine file as loaded, if runner.yaml names one
  declared(): Definition | undefined {
    return this.definition;
  }

  parameters(): Parameters | undefined {
    return this.params;
  }

  // Applies the whole body or none of it, signals the new values before
  // their events move the machine, and returns the problems of a refused
  // body; the notifier skips a document that did not change
  setParameters(body: ParametersBody): string[] {
    const result = this.params?.apply(body, (changes) =>
      this.queue.setParameters(changes),
    );
    this.changes.emit();
    this.requests.raiseAll(result?.events ?? [], (machine, event) =>
      this.move(machine, event),
    );
    return result?.problems ?? [];
  }

  // Moves an idle machine to any of its states
  transition(state: string, requestKey?: string): FsmReplyDto {
    return this.requests.transition(state, requestKey, (machine) => {
      if (!machine.hasState(state)) {
        return fsmReply('invalid state', machine.state);
      }
      if (this.status === 'running') {
        return fsmReply('busy', machine.state);
      }
      return this.enter(machine, state);
    });
  }

  event(event: string, requestKey?: string): FsmReplyDto {
    return this.requests.event(event, requestKey, (machine) => {
      const reply = this.move(machine, event);
      if (reply.status === 'no transition') {
        this.escalations.noTransition(machine, event);
      }
      return reply;
    });
  }

  private move(machine: StateMachine, event: string): FsmReplyDto {
    if (!machine.hasEvent(event)) {
      return fsmReply('invalid event', machine.state);
    }
    const next = machine.next(event);
    if (next === undefined) {
      return fsmReply('no transition', machine.state);
    }
    const left = next.stop ? machine.state : undefined;
    return this.enter(machine, next.state, left);
  }

  // ExecaManager joins a run in progress, which would not run the
  // script for this entry, so a state with a running script is refused.
  // A stop transition from the state left enters at once, making the
  // stopped script's completion stale, and runs the state's script once
  // that script has exited; a self-transition restarts the script.
  private enter(
    machine: StateMachine,
    state: string,
    left?: string,
  ): FsmReplyDto {
    if (left !== state && this.manager.isRunning(state)) {
      return fsmReply('script running', machine.state);
    }
    const entry = machine.enter(state);
    this.status = 'running';
    this.store.save(machine, this.status);
    this.stops.after(left, () => this.run(machine, state, entry));
    // without left, run enqueues the command synchronously, so the queue
    // has already signalled the full document; the notifier skips this one
    this.changes.emit();
    return fsmReply('accepted', state);
  }

  // Skipped after shutdown or a later entry (a stopped script may exit
  // late); otherwise it starts at once, so it runs before enter returns.
  // A script that finishes during shutdown still stores its status, and
  // only its completion transition is skipped.
  private async run(
    machine: StateMachine,
    state: string,
    entry: number,
  ): Promise<void> {
    if (this.stopping || machine.entry !== entry) {
      return;
    }
    const env = this.context.environment(state, state, entry);
    const script = { state, env };
    const outcome = await scriptOutcome(this.manager, script, this.logger);
    if (machine.entry !== entry) {
      return;
    }
    this.status = STATUS[outcome];
    this.changes.emit();
    this.store.save(machine, this.status);
    if (!this.stopping) {
      this.complete(machine, COMPLETION[outcome]);
    }
  }

  // No completion transition stops a script (the definition refuses
  // stop on them); a failure without a transition may escalate
  private complete(machine: StateMachine, event: CompletionEvent): void {
    const next = machine.next(event);
    if (next === undefined) {
      if (event === '$failure') {
        this.escalations.failure(machine);
      }
      return;
    }
    logStay(this.logger, this.enter(machine, next.state), event);
  }
}
