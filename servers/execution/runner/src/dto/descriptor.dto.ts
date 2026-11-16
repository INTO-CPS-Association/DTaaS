import { Attributes } from '../config/attributes.js';

// What the runner tells a Manager about the digital twin it serves;
// stateMachine says whether a state machine is loaded, manager lists
// the commands a Manager may submit, peers are the ids of the enabled
// peers, in the order of runner.yaml, and publicKey verifies what the
// runner signs, null without auth.key
export type DescriptorDto = {
  id: string;
  attributes: Attributes;
  commands: string[];
  stateMachine: boolean;
  manager: { commands: string[] };
  peers: string[];
  publicKey: string | null;
};
