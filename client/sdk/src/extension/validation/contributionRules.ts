import { STANDARD_SUBSTRATES } from '../constants';
import {
  printable,
  entries,
  LIST_SPECS,
  type ListSpec,
  type UntypedExtension,
  visualisationOf,
} from './validationUtils';

const STANDARD: ReadonlySet<string> = new Set(STANDARD_SUBSTRATES);

const duplicatesIn = (ext: UntypedExtension, spec: ListSpec): string[] => {
  const seen = new Set<string>();
  return entries(spec.pick(ext)).flatMap(({ item }) => {
    const value = printable(item[spec.key]);
    const duplicate = seen.has(value);
    seen.add(value);
    return duplicate ? [`${spec.label}: duplicate ${spec.key} "${value}"`] : [];
  });
};

/** Identifiers are unique within the extension. */
export const checkUniqueness = (ext: UntypedExtension): string[] =>
  LIST_SPECS.flatMap((spec) => duplicatesIn(ext, spec));

const collisions = (visualisation: UntypedExtension): string[] =>
  entries(visualisation.substrates).flatMap(({ item, index }) =>
    STANDARD.has(printable(item.id))
      ? [
          `visualisation.substrates[${index}]: "${printable(item.id)}" is a standard substrate and cannot be replaced`,
        ]
      : [],
  );

const unknownPresetSubstrates = (visualisation: UntypedExtension): string[] => {
  const contributed = entries(visualisation.substrates).map(({ item }) =>
    printable(item.id),
  );
  const known = new Set([...STANDARD, ...contributed]);
  return entries(visualisation.presets)
    .filter(({ item }) => typeof item.substrate === 'string')
    .filter(({ item }) => !known.has(item.substrate as string))
    .map(
      ({ item, index }) =>
        `visualisation.presets[${index}] "${printable(item.id)}": unknown substrate "${printable(item.substrate)}"`,
    );
};

/** Kits add substrates but never replace standard ones (goal 9). */
export const checkSubstrates = (ext: UntypedExtension): string[] => {
  const visualisation = visualisationOf(ext);
  return visualisation
    ? [...collisions(visualisation), ...unknownPresetSubstrates(visualisation)]
    : [];
};

export const checkDetect = (ext: UntypedExtension): string[] => {
  const visualisation = visualisationOf(ext);
  return visualisation && typeof visualisation.detect !== 'function'
    ? ['visualisation.detect must be a function']
    : [];
};
