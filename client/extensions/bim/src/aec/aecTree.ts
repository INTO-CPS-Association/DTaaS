/**
 * The property tree an IFC conversion writes beside its GLB: the storeys and,
 * for every object, its name, IFC class, storey, room and property sets. The
 * `aec` substrate reads it for the floor picker and the facts of a picked
 * object.
 * A model without a tree still draws, with fewer options.
 */

/** What the tree says about one object. Every field may be missing. */
export interface ObjectFacts {
  readonly name?: string;
  readonly ifcClass?: string;
  readonly storey?: string | null;
  readonly room?: string | null;
  /** IFC's own subtype of the class, such as a door that is a GATE. */
  readonly predefinedType?: string;
  /** What it is cut into, such as the wall a window sits in. */
  readonly host?: string;
  /** The property sets the model carries, by set name. */
  readonly properties?: Readonly<Record<string, Record<string, unknown>>>;
}

export interface PropertyTree {
  readonly storeys?: readonly { name: string; elevation_m?: number }[];
  readonly objects?: Readonly<Record<string, ObjectFacts>>;
}

/** The tree's address, beside the converted model. */
export function treeAddress(modelAddress: string): string {
  return modelAddress.replace(/\.glb$/i, '.json');
}

/** The tree at `url`, or an empty one when it is missing or unreadable. */
export async function loadTree(url: string): Promise<PropertyTree> {
  try {
    const response = await fetch(url, { credentials: 'include' });
    return response.ok ? ((await response.json()) as PropertyTree) : {};
  } catch {
    return {};
  }
}

/**
 * The storeys a person can choose, lowest first, keeping only those that
 * hold at least one object, so the picker never offers an empty floor.
 */
export function storeysOf(tree: PropertyTree): string[] {
  const used = new Set(
    Object.values(tree.objects ?? {}).flatMap((facts) =>
      facts.storey ? [facts.storey] : [],
    ),
  );
  const ordered = [...(tree.storeys ?? [])]
    .sort((a, b) => (a.elevation_m ?? 0) - (b.elevation_m ?? 0))
    .map((storey) => storey.name);
  const listed = [...new Set(ordered)].filter((name) => used.has(name));
  const unlisted = [...used]
    .filter((name) => !listed.includes(name))
    .sort((a, b) => a.localeCompare(b));
  return [...listed, ...unlisted];
}
