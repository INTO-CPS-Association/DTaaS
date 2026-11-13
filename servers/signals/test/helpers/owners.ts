import Owners, { type OwnerGroup } from 'src/authz/owners';

/** An owner map in memory. Each owner is its own group and owns its topics. */
export default function ownersOf(
  prefixes: Record<string, string[]> = {
    alice: ['alice/'],
    bob: ['bob/'],
    carol: ['carol/'],
  },
): Owners {
  const map = new Map<string, OwnerGroup>(
    Object.entries(prefixes).map(([owner, topics]) => [
      owner,
      { group: owner, topics },
    ]),
  );
  return { groups: async () => map } as unknown as Owners;
}
