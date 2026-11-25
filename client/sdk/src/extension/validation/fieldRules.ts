import {
  entries,
  entryLabel,
  type FieldKind,
  LIST_SPECS,
  type ListSpec,
  type Loose,
} from './validationUtils';

const ARTICLE: Record<FieldKind, string> = {
  string: 'a string',
  function: 'a function',
  array: 'an array',
};

const IS_KIND: Record<FieldKind, (value: unknown) => boolean> = {
  string: (value) => typeof value === 'string',
  function: (value) => typeof value === 'function',
  array: Array.isArray,
};

const fieldErrors = (ext: Loose, spec: ListSpec): string[] =>
  entries(spec.pick(ext)).flatMap((entry) =>
    Object.entries(spec.fields)
      .filter(([field, kind]) => !IS_KIND[kind](entry.item[field]))
      .map(
        ([field, kind]) =>
          `${entryLabel(spec, entry)}: ${field} must be ${ARTICLE[kind]}`,
      ),
  );

/** Every entry has the fields the host will read or call. */
const checkRequiredFields = (ext: Loose): string[] =>
  LIST_SPECS.flatMap((spec) => fieldErrors(ext, spec));

export default checkRequiredFields;
