// The capabilities that setpriv needs to start a script as another
// account, and that the runner needs to signal it, by bit
const NEEDED: ReadonlyArray<[string, bigint]> = [
  ['CAP_SETUID', 7n],
  ['CAP_SETGID', 6n],
  ['CAP_KILL', 5n],
];

// A line of /proc/<pid>/status that holds a capability set in hex
const CAPABILITY_LINE = /^(Cap[A-Za-z]+):\s*([0-9a-fA-F]+)\s*$/gm;

// The bit mask of a capability set in the text of /proc/<pid>/status;
// a missing line is an empty set
function capabilitySet(status: string, set: string): bigint {
  const line = [...status.matchAll(CAPABILITY_LINE)].find(
    ([, name]) => name === set,
  );
  return line === undefined ? 0n : BigInt(`0x${line[2]}`);
}

// The names of the needed capabilities that the effective or the
// ambient set lacks. Only the ambient set passes through execve to
// setpriv, which has no file capabilities of its own.
export function missingCapabilities(status: string): string[] {
  const held =
    capabilitySet(status, 'CapEff') & capabilitySet(status, 'CapAmb');
  return NEEDED.filter(([, bit]) => ((held >> bit) & 1n) === 0n).map(
    ([name]) => name,
  );
}
