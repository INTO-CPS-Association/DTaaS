import { useHost, type HostServices } from '@into-cps-association/dtaas-sdk';
import {
  formatDepth,
  formatReading,
  QUANTITIES,
  unitOf,
  type SoilSensor,
} from 'examples/soil-kit/src/core';
import ProfileTable, {
  type SensorRow,
} from 'examples/soil-kit/src/react/ProfileTable';
import configSchema from 'examples/soil-kit/src/dtaas/config';
import useReadings from 'examples/soil-kit/src/dtaas/pages/useReadings';
import useSoilTwin, {
  type SoilTwin,
} from 'examples/soil-kit/src/dtaas/pages/useSoilTwin';

const NO_PROFILES = new Map<string, SoilSensor[]>();

const profilesIn = (twin: SoilTwin) =>
  twin.status === 'ready' ? twin.profiles : NO_PROFILES;

/** What the page says instead of the tables, when there are none. */
function statusOf(twin: SoilTwin): string | undefined {
  if (twin.status === 'loading') return 'Reading the soil twin.';
  if (twin.status === 'missing') {
    return `No visualisation.json in ${twin.path}.`;
  }
  if (twin.status === 'failed') return twin.message;
  return twin.profiles.size === 0
    ? `${twin.name} has no soil-depth anchors.`
    : undefined;
}

/** One row of a profile table: a sensor and its reading at `t`. */
const rowOf =
  (host: HostServices, t: number) =>
  (sensor: SoilSensor): SensorRow => ({
    key: sensor.signalPath,
    depth: formatDepth(sensor),
    quantity: QUANTITIES[sensor.quantity]?.label ?? sensor.quantity,
    device: sensor.deviceId,
    reading: formatReading(
      host.signals.valueAt(sensor.signalPath, 'measured', t)?.value,
      unitOf(sensor.quantity),
    ),
  });

/** Lists the profiles of the soil twin, with the reading of each sensor at the playhead. */
function SoilPage() {
  const host = useHost();
  const { Page } = host.ui;
  const { twin } = host.config(configSchema);
  const state = useSoilTwin(host, twin);
  const profiles = profilesIn(state);
  const sensors = [...profiles.values()].flat();
  useReadings(
    host,
    sensors.map((sensor) => sensor.signalPath),
  );
  const t = host.signals.playhead.use();
  const status = statusOf(state);
  return (
    <Page title="Soil" description="The profiles of the soil twin">
      {status && <p role="status">{status}</p>}
      {[...profiles].map(([profile, list]) => (
        <ProfileTable
          key={profile}
          profile={profile}
          rows={list.map(rowOf(host, t))}
        />
      ))}
    </Page>
  );
}

export default SoilPage;
