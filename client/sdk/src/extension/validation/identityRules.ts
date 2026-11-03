import { SDK_MAJOR } from '../constants';
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

/** id, name, version and sdk major. */
export const checkIdentity = (
  ext: Loose,
  reservedIds: readonly string[],
): string[] => [
  ...checkId(ext, reservedIds),
  ...['name', 'version']
    .filter((key) => !isNonEmptyString(ext[key]))
    .map((key) => `${key} must be a non-empty string`),
  ...(ext.sdk === SDK_MAJOR ? [] : [`sdk must be ${SDK_MAJOR}`]),
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
