/**
 * The platform services a deployment lists for the workbench page.
 *
 * The services (Grafana, InfluxDB, RabbitMQ, ThingsBoard and others) are
 * installed next to DTaaS with the dtaas-services command, so only the
 * deployment knows which ones run and where. It lists them in `env.js` as
 * `REACT_APP_PLATFORM_SERVICES`, entries of the form `<name>=<url>`
 * separated by commas, for example
 * `'grafana=https://foo.com/grafana,rabbitmq=https://foo.com/rabbitmq'`.
 */

import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import DevicesOtherOutlinedIcon from '@mui/icons-material/DevicesOtherOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { isSafeHttpUrl } from 'util/configuredLink';

export const PLATFORM_SERVICES_KEY = 'REACT_APP_PLATFORM_SERVICES';

export interface PlatformService {
  name: string;
  link: string;
  description?: string;
  icon: React.ReactElement;
}

interface KnownService {
  name: string;
  description: string;
  icon: React.ReactElement;
}

const knownServices: Readonly<Record<string, KnownService>> = {
  grafana: {
    name: 'Grafana',
    description: 'Dashboards of the measurements.',
    icon: <InsightsOutlinedIcon />,
  },
  influxdb: {
    name: 'InfluxDB',
    description: 'The time-series database of the measurements.',
    icon: <StorageOutlinedIcon />,
  },
  rabbitmq: {
    name: 'RabbitMQ',
    description: 'The message broker, with MQTT and its management console.',
    icon: <HubOutlinedIcon />,
  },
  thingsboard: {
    name: 'ThingsBoard',
    description: 'Devices, rules and dashboards of the Internet of Things.',
    icon: <DevicesOtherOutlinedIcon />,
  },
};

function toService(entry: string): PlatformService | undefined {
  const separator = entry.indexOf('=');
  if (separator <= 0) return undefined;
  const key = entry.slice(0, separator).trim();
  const link = entry.slice(separator + 1).trim();
  // A configured address goes into an href, so only http and https pass.
  if (!isSafeHttpUrl(link)) return undefined;
  const known = knownServices[key.toLowerCase()];
  if (known === undefined) {
    return { name: key, link, icon: <OpenInNewIcon /> };
  }
  return { ...known, link };
}

/** The services listed in the value, skipping every malformed entry. */
export function platformServices(value: unknown): PlatformService[] {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((entry) => toService(entry.trim()))
    .filter((service): service is PlatformService => service !== undefined);
}
