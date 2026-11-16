// The identities and addresses of the demo, as in runner.yaml and
// runner-2.yaml
export const DTS = {
  'hospital-1': { base: 'dtaas/hospital-1', url: 'http://127.0.0.1:5100' },
  'hospital-2': { base: 'dtaas/hospital-2', url: 'http://127.0.0.1:5200' },
};
// The DT of the tools that name none, through DT_ID
export const ID = process.env.DT_ID ?? 'hospital-1';
export const BASE = DTS[ID]?.base ?? `dtaas/${ID}`;
export const RUNNER_URL = DTS[ID]?.url;
// The topics of every DT's notifications
export const NOTIFY_TOPICS = 'dtaas/+/notify/+';
export const BROKER_PORT = 18830;
export const WEBHOOK_PORT = 18080;
