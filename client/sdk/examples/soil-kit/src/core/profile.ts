/**
 * The sensors of a soil twin, read from the `soil-depth` anchors of its
 * `visualisation.json`: each anchor ties one signal, a quantity of one probe,
 * to a profile and a depth range. In SOSA terms the profile is the platform,
 * the probe at one depth range the sensor and the quantity the observed
 * property.
 */

import type { Anchor } from '@into-cps-association/dtaas-sdk';
import { parseDepthRef, type DepthRange } from './depth';
import { parseSoilTopic } from './topic';

export const SOIL_DEPTH = 'soil-depth';

export interface SoilSensor extends DepthRange {
  readonly signalPath: string;
  readonly deviceId: string;
  readonly quantity: string;
}

/**
 * The sensor an anchor describes, or `undefined` when the anchor is of
 * another kind, its reference is invalid or names another profile than its
 * topic does.
 */
export function sensorOf(anchor: Anchor): SoilSensor | undefined {
  if (anchor.kind !== SOIL_DEPTH) return undefined;
  const depth = parseDepthRef(anchor.ref);
  const topic = parseSoilTopic(anchor.signalPath);
  if (!depth || !topic || topic.profile !== depth.profile) return undefined;
  return {
    ...depth,
    signalPath: anchor.signalPath,
    deviceId: topic.deviceId,
    quantity: topic.quantity,
  };
}

/** Upper depth first, then the quantity, so each profile reads downwards. */
export const byDepth = (a: SoilSensor, b: SoilSensor): number =>
  a.from - b.from || a.to - b.to || a.quantity.localeCompare(b.quantity);

/** The sensors of every profile, by profile name in order. */
export function profilesOf(
  anchors: readonly Anchor[],
): Map<string, SoilSensor[]> {
  const sensors = anchors
    .map(sensorOf)
    .filter((sensor): sensor is SoilSensor => sensor !== undefined);
  const profiles = new Map<string, SoilSensor[]>();
  [...new Set(sensors.map((sensor) => sensor.profile))]
    .sort((a, b) => a.localeCompare(b))
    .forEach((profile) =>
      profiles.set(
        profile,
        sensors.filter((sensor) => sensor.profile === profile).sort(byDepth),
      ),
    );
  return profiles;
}
