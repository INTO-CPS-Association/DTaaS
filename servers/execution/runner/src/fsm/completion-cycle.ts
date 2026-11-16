import type { CompletionEvent, Definition, Transitions } from './definition.js';

// $stopped follows only a stop request from outside, so a loop through
// it can not run by itself
const LOOPING_EVENTS: CompletionEvent[] = ['$success', '$failure'];

const completionTargets = (transitions?: Transitions): string[] =>
  LOOPING_EVENTS.flatMap((event) => transitions?.get(event)?.state ?? []);

// Depth-first search from the last state of the path; a cycle is a
// path that reaches a state already on it. The done states have been
// searched, so they lead to no cycle that is not found already.
function findCycle(
  states: Definition['states'],
  path: string[],
  done: Set<string>,
): string[] | undefined {
  const state = path.at(-1) as string;
  const start = path.indexOf(state);
  if (start < path.length - 1) {
    return path.slice(start);
  }
  if (done.has(state)) {
    return undefined;
  }
  done.add(state);
  return completionTargets(states.get(state))
    .map((target) => findCycle(states, [...path, target], done))
    .find(Boolean);
}

// A loop of completion transitions, which would run scripts forever
export default function completionCycle({
  states,
}: Definition): string[] | undefined {
  const done = new Set<string>();
  return [...states.keys()]
    .map((state) => findCycle(states, [state], done))
    .find(Boolean);
}
