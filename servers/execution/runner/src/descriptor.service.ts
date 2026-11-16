import { Injectable, OnModuleInit } from '@nestjs/common';
import Config from './config/configuration.service.js';
import { DescriptorDto } from './dto/descriptor.dto.js';
import { MetricsDto } from './dto/metrics.dto.js';
import { commandState, StateDocumentDto } from './dto/state.dto.js';
import { EscalationListener } from './fsm/escalation.js';
import FsmService from './fsm/fsm.service.js';
import Metrics from './fsm/metrics.js';
import { ChangeListener } from './notify/changes.js';
import Peers from './peers/peers.js';
import Queue from './queue.service.js';

// Milliseconds since the epoch, on the monotonic clock of the process
const now = (): number => performance.timeOrigin + performance.now();

// Describes the digital twin that this runner serves, its state, and
// the metrics of what it did since the runner started
@Injectable()
export default class DescriptorService implements OnModuleInit {
  private readonly counters = new Metrics();

  // The peers of runner.yaml, which PeerWatch follows
  private readonly peerList = new Peers();

  constructor(
    private readonly config: Config,
    private readonly fsm: FsmService,
    private readonly queue: Queue,
  ) {}

  // Runs at init, after main.ts restored the machine, which is the
  // baseline of the metrics, and opened the database of the queue
  onModuleInit(): void {
    this.counters.start(this.fsm.check(), performance.timeOrigin);
    this.fsm.onChange(() => this.counters.observe(this.fsm.check(), now()));
    this.fsm.onAnswer((request, reply) =>
      this.counters.answered(request, reply),
    );
    this.fsm.onEscalation((data) => this.counters.escalated(data));
    this.peerList.load(this.config.getPeers(), this.queue);
  }

  peers(): Peers {
    return this.peerList;
  }

  describe(): DescriptorDto {
    return {
      id: this.config.getId(),
      attributes: this.config.getAttributes(),
      commands: this.config.permitCommands(),
      stateMachine: this.fsm.check() !== undefined,
      manager: { commands: this.fsm.declared()?.managerCommands ?? [] },
      peers: this.peerList.enabledIds(),
      publicKey: this.config.getSigner().publicKey(),
    };
  }

  state(): StateDocumentDto {
    return {
      id: this.config.getId(),
      time: new Date().toISOString(),
      machine: this.fsm.check() ?? null,
      parameters: this.fsm.parameters()?.values() ?? {},
      command: commandState(this.queue.activeCommand()),
    };
  }

  metrics(): MetricsDto {
    return {
      since: new Date(performance.timeOrigin).toISOString(),
      uptime: Math.floor(process.uptime()),
      commands: this.queue.commandCounts(),
      resources: this.queue.resourceTotals(),
      ...this.counters.report(now()),
    };
  }

  // The state machine and the queue each signal a change of the state
  // document
  onChange(listener: ChangeListener): void {
    this.fsm.onChange(listener);
    this.queue.onChange(listener);
  }

  onEscalation(listener: EscalationListener): void {
    this.fsm.onEscalation(listener);
  }
}
