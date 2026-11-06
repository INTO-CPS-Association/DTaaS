/** An extension as untyped data: kits may be plain JavaScript. */
export type Loose = Record<string, unknown>;

/** Valid extension id format: starts with lowercase, lowercase/digits/hyphens. */
export const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

export const isObject = (value: unknown): value is Loose =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** An object item of a contribution list, with its index in that list. */
export interface Entry {
  readonly item: Loose;
  readonly index: number;
}

/** The object items of a list; non-objects are reported by `checkShapes`. */
export const entries = (value: unknown): Entry[] =>
  Array.isArray(value)
    ? value.flatMap((item, index) => (isObject(item) ? [{ item, index }] : []))
    : [];

export const visualisationOf = (ext: Loose): Loose | undefined =>
  isObject(ext.visualisation) ? ext.visualisation : undefined;

/** Printable form of an identifier, even for values without `toString`. */
export const describe = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  try {
    return String(value);
  } catch {
    return '[object]';
  }
};

export type FieldKind = 'string' | 'function' | 'array';

/** A contribution list, the property that identifies its entries, and its required fields. */
export interface ListSpec {
  readonly label: string;
  readonly key: string;
  readonly fields: Readonly<Record<string, FieldKind>>;
  pick(ext: Loose): unknown;
}

const topLevel = (
  name: string,
  key: string,
  fields: ListSpec['fields'],
): ListSpec => ({ label: name, key, fields, pick: (ext) => ext[name] });

const nested = (
  name: string,
  key: string,
  fields: ListSpec['fields'],
): ListSpec => ({
  label: `visualisation.${name}`,
  key,
  fields,
  pick: (ext) => visualisationOf(ext)?.[name],
});

export const LIST_SPECS: readonly ListSpec[] = [
  topLevel('routes', 'path', { path: 'string' }),
  topLevel('navigation', 'path', { label: 'string', path: 'string' }),
  topLevel('digitalTwinTabs', 'id', {
    id: 'string',
    label: 'string',
    applies: 'function',
  }),
  topLevel('assetPreviews', 'id', { id: 'string' }),
  nested('anchorKinds', 'kind', {
    kind: 'string',
    substrates: 'array',
    resolve: 'function',
  }),
  nested('converters', 'id', { id: 'string', from: 'array', to: 'string' }),
  nested('presets', 'id', { id: 'string', substrate: 'string' }),
  nested('scopes', 'id', { id: 'string', label: 'string', group: 'function' }),
  nested('fieldKernels', 'id', { id: 'string' }),
  nested('substrates', 'id', { id: 'string', supports: 'array' }),
];

export const listSpec = (label: string): ListSpec =>
  LIST_SPECS.find((spec) => spec.label === label) as ListSpec;

/** E.g. `routes[1] "detail"`. */
export const entryLabel = (spec: ListSpec, { item, index }: Entry) =>
  `${spec.label}[${index}] "${describe(item[spec.key])}"`;
