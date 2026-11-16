// The second half of the story of the demo (steps.mjs): the peer
// events, the escalations, history, metrics, stop and shutdown
import { fsmIs, logHas } from './waits.mjs';

export const H1 = 'hospital-1';
export const H2 = 'hospital-2';
export const admit = (patient, ward) =>
  `'{"name":"admit","input":{"patient":"${patient}","ward":"${ward}"}}'`;
// hospital-1's open logs where overflow goes at each entry
export const overflowLogged = (times) =>
  logHas(`${H1}/ward.log`, 'overflow to', times);
const raised = `grep -o 'Raised.*' run/${H1}/runner.log`;

export default [
  { chapter: 'Peer event: neighbour full' },
  {
    say: 'hospital-2 admits two patients, one over MQTT, and has no bed left.',
  },
  { run: `mq2 execute ${admit('p-5', 'cardiology')}` },
  { run: `dt2 / --json ${admit('p-6', 'maternity')} | tail -n 1` },
  { wait: fsmIs(H2, 'full', 'valid') },
  { wait: overflowLogged(4) },
  {
    say: 'hospital-2 went full, and its full found hospital-1 open (right). hospital-1 raised:',
  },
  { run: `${raised}; tail -n 1 run/${H1}/ward.log` },

  { chapter: 'Script raises an event; escalation on failure' },
  { say: 'Under multi, p-3 gets a bed in maternity; p-4 takes the last bed.' },
  { run: `dt1 / --json ${admit('p-3', 'cardiology')} | tail -n 1` },
  { run: `dt1 / --json ${admit('p-4', 'maternity')} | tail -n 1` },
  { wait: fsmIs(H1, 'full', 'invalid') },
  {
    say: 'open raised full over HTTP; full found no open peer and failed, which escalates (right).',
  },
  { run: `tail -n 2 run/${H1}/ward.log` },

  { chapter: 'Escalation on no transition' },
  {
    say: 'Intentional refusal: full has no transition for close. The runner escalates once per entry.',
  },
  { run: `dt1 /fsm/event --json '{"event":"close"}'` },
  { run: `dt1 /fsm/event --json '{"event":"close"}' | tail -n 1` },
  { run: 'grep -c no-transition run/mqtt.log' },

  { chapter: 'MQTT request/response with input' },
  {
    say: 'The Manager discharges p-1 over MQTT; discharge raises beds-free, which reopens hospital-1.',
  },
  { run: `mq1 execute '{"name":"discharge","input":{"patient":"p-1"}}'` },
  { wait: fsmIs(H1, 'open', 'running', 6) },
  { wait: overflowLogged(5) },
  { run: 'mq1 fsm' },

  { chapter: 'Disable and enable a peer' },
  {
    say: 'Disabling hospital-2 unsubscribes from it and forgets what it told:',
  },
  { run: `dt1 /peers -X PUT --json '{"hospital-2":false}'` },
  {
    say: 'Enabled again, its retained full counts as a change: neighbour-full restarts open.',
  },
  { run: `dt1 /peers -X PUT --json '{"hospital-2":true}' | tail -n 1` },
  { wait: overflowLogged(6) },
  { run: `${raised} | tail -n 1` },

  { chapter: 'Peer event: neighbour down' },
  {
    say: 'The runner of hospital-2 crashes; the broker publishes its will, offline with no time (right).',
  },
  { kill: H2, show: 'kill -9 %3' },
  { wait: overflowLogged(7) },
  { run: `${raised} | tail -n 1` },
  { run: 'dt1 /peers | head -n 8' },

  { chapter: 'History and metrics' },
  {
    say: 'The history since a time, newest last; state scripts have no caller, commands have one:',
  },
  { run: `dt1 "/history?since=$(date -u -d '-90 sec' +%FT%TZ)&limit=2"` },
  { run: `dt1 /history | grep '"by"' | sort | uniq -c` },
  { run: 'dt1 /metrics' },

  { chapter: 'Stop' },
  {
    say: 'A stop sends SIGTERM, then SIGKILL after stopGrace; on Windows PowerShell ends at once.',
  },
  { run: 'grep stopGrace runner.yaml' },
  { run: `dt1 /stop --json '{"name":"open"}'` },
  { wait: fsmIs(H1, 'closed', 'valid') },
  { say: '$stopped led open to closed:' },
  { run: 'dt1 /fsm | head -n 4' },

  { chapter: 'Webhook' },
  {
    say: 'The webhook received every notification of both DTs; here those that are not state documents:',
  },
  { run: "grep -v ' | ' run/webhook.log" },

  { chapter: 'Presence: offline' },
  {
    say: 'Graceful shutdown, as on Ctrl+C: hospital-1 leaves with an offline notice (right).',
  },
  { run: 'touch run/shutdown' },
  { stop: H1 },
  {
    say: 'A Manager that subscribes now gets the retained state and presence of both DTs:',
  },
  { run: 'mq retained' },
  { say: 'End of the demo.' },
];
