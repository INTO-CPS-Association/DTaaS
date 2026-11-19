import { describe, entries, type Loose } from './validationUtils';

/** A provided service is named after its extension, as `<id>.<name>`. */
const foreignServices = (ext: Loose): string[] =>
  entries(ext.provides)
    .filter(({ item }) => !describe(item.id).startsWith(`${describe(ext.id)}.`))
    .map(
      ({ item, index }) =>
        `provides[${index}] "${describe(item.id)}": id must start with "${describe(ext.id)}."`,
    );

const badRequirements = (ext: Loose): string[] => {
  if (ext.requires === undefined) return [];
  const valid =
    Array.isArray(ext.requires) &&
    ext.requires.every((id) => typeof id === 'string' && id !== '');
  return valid ? [] : ['requires must be an array of service ids'];
};

/** What an extension offers to the others and what it needs from them. */
const checkServices = (ext: Loose): string[] => [
  ...foreignServices(ext),
  ...badRequirements(ext),
];

export default checkServices;
