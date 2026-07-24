import { type CorsAllowOrigin } from './config.interface.js';

function normalizeSingleOrigin(configuredOrigin: string): string {
  const trimmedOrigin = configuredOrigin.trim();
  if (/^https?:\/\//i.test(trimmedOrigin)) return trimmedOrigin;
  return `http://${trimmedOrigin}`;
}

export function normalizeCorsOrigin(
  configuredOrigin: CorsAllowOrigin,
): boolean | string | string[] {
  if (Array.isArray(configuredOrigin)) {
    return configuredOrigin.map(normalizeSingleOrigin);
  }
  const trimmedOrigin = configuredOrigin.trim();
  if (trimmedOrigin === '') return false;
  if (trimmedOrigin === '*') return true;
  return normalizeSingleOrigin(trimmedOrigin);
}

export function buildCorsOptions(
  configuredOrigin: CorsAllowOrigin,
  credentials: boolean,
): {
  origin: boolean | string | string[];
  methods: string[];
  credentials: boolean;
} {
  const origin = normalizeCorsOrigin(configuredOrigin);
  if (credentials && origin === true) {
    throw new Error(
      'cors-allow-credentials cannot be enabled with cors-allow-origin: *',
    );
  }
  return {
    origin,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials,
  };
}
