export function normalizeCorsOrigin(
  configuredOrigin: string,
  port: number,
): boolean | string {
  const trimmedOrigin = configuredOrigin.trim();
  const defaultOrigin = `0.0.0.0:${port}`;
  if (trimmedOrigin === defaultOrigin) {
    return true;
  }
  if (trimmedOrigin === '*') {
    return true;
  }
  if (/^https?:\/\//i.test(trimmedOrigin)) {
    return trimmedOrigin;
  }
  return `http://${trimmedOrigin}`;
}

export function buildCorsOptions(
  configuredOrigin: string,
  port: number,
): { origin: boolean | string; methods: string[]; credentials: true } {
  return {
    origin: normalizeCorsOrigin(configuredOrigin, port),
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  };
}
