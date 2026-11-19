import Owners, { type OwnerGroup } from 'src/authz/owners';

const DEFAULT_PREFIXES: Record<string, string[]> = {
  alice: ['alice/'],
  bob: ['bob/'],
  carol: ['carol/'],
};

/** An owner map in memory. Each owner is its own group and owns its topics. */
export default function ownersOf(
  prefixes: Record<string, string[]> = DEFAULT_PREFIXES,
): Owners {
  const map = new Map<string, OwnerGroup>(
    Object.entries(prefixes).map(([owner, topics]) => [
      owner,
      { group: owner, topics },
    ]),
  );
  return { groups: () => Promise.resolve(map) } as unknown as Owners;
}
