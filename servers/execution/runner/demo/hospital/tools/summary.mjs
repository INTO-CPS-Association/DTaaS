// One line for a notification of a runner, for the network pane of the
// recording, the MQTT and webhook logs and `mq retained`: the time of
// the notification, the DT, the mark of jws.mjs and a summary. An
// INVALID message shows why, and its payload as it came, unverified.
import unwrap from './jws.mjs';

const COLORS = { 'hospital-1': 36, 'hospital-2': 35 };
const paint = (code, text, color) =>
  color ? `\x1b[${code}m${text}\x1b[0m` : text;

function machine(data) {
  const { state, status, entry } = data.machine ?? {};
  return state ? `${state}#${entry} ${status}` : 'no state yet';
}

function command(data) {
  return data.command ? `${data.command.name}:${data.command.status}` : '-';
}

function state(data) {
  const { scope, fidelity } = data.parameters ?? {};
  const parameters = `scope=${scope} fidelity=${fidelity}`;
  return `${machine(data)} | ${command(data)} | ${parameters}`;
}

function presence(data, time) {
  if (!data.online) {
    return time ? 'offline' : 'offline (the will)';
  }
  const peers = data.descriptor.peers.join(', ') || 'none';
  return `online, peers ${peers}`;
}

function escalation(data) {
  const proposal = data.proposal ? ` ${JSON.stringify(data.proposal)}` : '';
  const where = `${data.state}#${data.entry}`;
  return `escalation ${data.trigger} ${where}: ${data.reason}${proposal}`;
}

const SUMMARIES = { state, presence, escalation };
const LOUD = { escalation: 33, presence: 1 };

function summary({ kind, time, data }, color) {
  const text = SUMMARIES[kind]?.(data, time) ?? JSON.stringify(data);
  return LOUD[kind] ? paint(LOUD[kind], text, color) : text;
}

// The line of a message of the DT of the given id, or of the DT that
// the message names
export default function notice(text, id, color = false) {
  const { mark, value, reason, unverified } = unwrap(text, id);
  const dt = id ?? value?.id ?? unverified?.id ?? '?';
  const name = paint(COLORS[dt] ?? 0, dt.padEnd(10), color);
  if (mark === 'INVALID') {
    const shown = JSON.stringify(unverified ?? null);
    const why = paint(31, `INVALID  (${reason})`, color);
    return `--:--:-- ${name} ${why} unverified ${shown}`;
  }
  const clock = value.time ? value.time.slice(11, 19) : '--:--:--';
  const marked = paint(mark === 'verified' ? 32 : 31, mark.padEnd(8), color);
  return `${clock} ${name} ${marked} ${summary(value, color)}`;
}
