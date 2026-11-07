import type { DigitalTwinSummary } from '@into-cps-association/dtaas-sdk';

/** Framework-free domain logic: usable outside React and outside DTaaS. */
export const isSoilTwin = (dt: DigitalTwinSummary): boolean =>
  dt.domain === 'soil';

/** The substrate that draws a soil profile. */
export const SOIL_PROFILE = 'soil-profile';

export { formatDepth, parseDepthRef, type DepthRange } from './depth';
export {
  binMeans,
  heatmapGrid,
  type TimedValue,
  type TimeWindow,
} from './heatmap';
export {
  byDepth,
  profilesOf,
  sensorOf,
  SOIL_DEPTH,
  type SoilSensor,
} from './profile';
export { parseSoilTopic, TOPIC_LEVEL, type SoilTopic } from './topic';
export { formatReading, QUANTITIES, unitOf, type QuantitySpec } from './units';
