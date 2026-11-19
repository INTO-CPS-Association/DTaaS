import type { DigitalTwinSummary } from '@into-cps-association/dtaas-sdk';

/** Framework-free domain logic: usable outside React and outside DTaaS. */
export const isHelloTwin = (dt: DigitalTwinSummary): boolean =>
  dt.domain === 'hello' || dt.files.some((file) => file.endsWith('.hello'));

export const formatReading = (value: unknown, unit: string): string =>
  typeof value === 'number' ? `${value.toFixed(1)} ${unit}` : 'no reading';

const NODE_REF = /^node:([a-z0-9-]+)$/;

/** `node:room1` → `room1`; `undefined` for anything else. */
export const parseNodeRef = (ref: string): string | undefined =>
  NODE_REF.exec(ref)?.[1];
