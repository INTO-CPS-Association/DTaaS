import type { ConnectionState } from './visualisation.types';

const SEVERITY: Record<ConnectionState, number> = {
  live: 0,
  connecting: 1,
  down: 2,
};

/** The least healthy state; `live` when nothing is waiting. */
const worstConnectionState = (
  states: readonly ConnectionState[],
): ConnectionState =>
  states.reduce<ConnectionState>(
    (worst, state) => (SEVERITY[state] > SEVERITY[worst] ? state : worst),
    'live',
  );

export default worstConnectionState;
