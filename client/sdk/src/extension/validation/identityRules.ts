import { SDK_MAJOR } from '../constants';
import { isApiRange, satisfiesApiRange } from '../apiRange';
import {
  ID_PATTERN,
  isObject,
  LIST_SPECS,
  type Loose,
  visualisationOf,
} from './validationUtils';

const isNonEmptyString = (value: unknown) =>
  typeof value === 'string' && value !== '';

const checkId = (ext: Loose, reservedIds: readonly string[]): string[] => {
  if (typeof ext.id !== 'string' || !ID_PATTERN.test(ext.id)) {
    return [`id must be a string matching ${ID_PATTERN.source}`];
  }
  return reservedIds.includes(ext.id)
    ? [`id "${ext.id}" is reserved by the host`]
    : [];
};

/** The declared API range, which the host's API version must satisfy. */
const checkApiRange = (ext: Loose, hostApiVersion: string): string[] => {
  if (ext.apiRange === undefined) return [];
  if (!isApiRange(ext.apiRange)) {
    return ['apiRange must be a version range such as "^1.1"'];
  }
  return satisfiesApiRange(hostApiVersion, ext.apiRange)
    ? []
    : [
        `apiRange "${ext.apiRange}" does not include this host's API ${hostApiVersion}`,
      ];
};

/** id, name, version, sdk major and API range. */
export const checkIdentity = (
  ext: Loose,
  reservedIds: readonly string[],
  hostApiVersion: string,
): string[] => [
  ...checkId(ext, reservedIds),
  ...['name', 'version']
    .filter((key) => !isNonEmptyString(ext[key]))
    .map((key) => `${key} must be a non-empty string`),
  ...(ext.sdk === SDK_MAJOR ? [] : [`sdk must be ${SDK_MAJOR}`]),
  ...checkApiRange(ext, hostApiVersion),
];

const nonObjectItems = (label: string, items: unknown[]): string[] =>
  items.flatMap((item, i) =>
    isObject(item) ? [] : [`${label}[${i}] must be an object`],
  );

/** Contribution containers and their items have the right JavaScript type. */
export const checkShapes = (ext: Loose): string[] => {
  const errors: string[] = [];
  if (ext.visualisation !== undefined && !visualisationOf(ext)) {
    errors.push('visualisation must be an object');
  }
  LIST_SPECS.forEach((spec) => {
    const value = spec.pick(ext);
    if (value !== undefined && !Array.isArray(value)) {
      errors.push(`${spec.label} must be an array`);
    }
    if (Array.isArray(value)) errors.push(...nonObjectItems(spec.label, value));
  });
  return errors;
};
