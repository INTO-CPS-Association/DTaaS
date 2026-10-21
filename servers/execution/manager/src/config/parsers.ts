export function trimSlashes(prefix: string): string {
  return prefix.trim().replace(/^\/+|\/+$/g, '');
}

export function nonBlank(envValue: string | undefined): string | undefined {
  if (envValue === undefined || envValue.trim() === '') return undefined;
  return envValue.trim();
}

export function parsePositiveIntegerEnv(
  envValue: string | undefined,
  variableName: string,
): number | undefined {
  const value = nonBlank(envValue);
  if (value === undefined) return undefined;

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${variableName} must be a positive integer`);
  }
  return parsed;
}
