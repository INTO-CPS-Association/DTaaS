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

export function envSettings<Setting extends string>(
  variables: Record<Setting, string>,
  env: NodeJS.ProcessEnv,
): Partial<Record<Setting, string>> {
  const settings: Partial<Record<Setting, string>> = {};
  for (const setting of Object.keys(variables) as Setting[]) {
    const value = env[variables[setting]];
    if (nonBlank(value) !== undefined) settings[setting] = value;
  }
  return settings;
}
