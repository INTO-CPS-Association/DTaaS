import { printable, entries, type UntypedExtension } from './validationUtils';

/** A provided service is named after its extension, as `<id>.<name>`. */
const foreignServices = (ext: UntypedExtension): string[] =>
  entries(ext.provides)
    .filter(
      ({ item }) => !printable(item.id).startsWith(`${printable(ext.id)}.`),
    )
    .map(
      ({ item, index }) =>
        `provides[${index}] "${printable(item.id)}": id must start with "${printable(ext.id)}."`,
    );

const badRequirements = (ext: UntypedExtension): string[] => {
  if (ext.requires === undefined) return [];
  const valid =
    Array.isArray(ext.requires) &&
    ext.requires.every((id) => typeof id === 'string' && id !== '');
  return valid ? [] : ['requires must be an array of service ids'];
};

/** What an extension offers to the others and what it needs from them. */
const checkServices = (ext: UntypedExtension): string[] => [
  ...foreignServices(ext),
  ...badRequirements(ext),
];

export default checkServices;
