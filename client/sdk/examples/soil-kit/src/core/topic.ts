/**
 * The topic of a soil reading: the eight levels of the DTaaS naming
 * convention, named for the soil domain. The site is the `building` level,
 * the plot the `unit_id` level and the profile the `area` level, so a soil
 * twin needs no new level.
 */

export interface SoilTopic {
  readonly project: string;
  readonly site: string;
  readonly level: string;
  readonly plot: string;
  readonly profile: string;
  readonly deviceType: string;
  readonly deviceId: string;
  readonly quantity: string;
}

/** One topic level, as the broker accounts of dtaas-services accept it. */
export const TOPIC_LEVEL = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const LEVELS = 8;

/** The levels of a signal path, or `undefined` when it is not a soil topic. */
export function parseSoilTopic(path: string): SoilTopic | undefined {
  const levels = path.split('/');
  if (levels.length !== LEVELS) return undefined;
  if (!levels.every((level) => TOPIC_LEVEL.test(level))) return undefined;
  const [project, site, level, plot, profile, deviceType, deviceId, quantity] =
    levels;
  return {
    project,
    site,
    level,
    plot,
    profile,
    deviceType,
    deviceId,
    quantity,
  };
}
