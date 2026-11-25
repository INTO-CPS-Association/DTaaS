import { isLazyComponent, isLazyLoader } from '../lazy';
import {
  entries,
  entryLabel,
  type ListSpec,
  listSpec,
  type Loose,
  visualisationOf,
} from './validationUtils';

const ELEMENT_LISTS = ['routes', 'digitalTwinTabs', 'assetPreviews'];
const LOADER_LISTS = [
  'visualisation.converters',
  'visualisation.fieldKernels',
  'visualisation.substrates',
];

const checkEntries = (
  ext: Loose,
  spec: ListSpec,
  property: string,
  problem: string,
): string[] => {
  const isLazy = property === 'element' ? isLazyComponent : isLazyLoader;
  return entries(spec.pick(ext)).flatMap((entry) =>
    isLazy(entry.item[property])
      ? []
      : [`${entryLabel(spec, entry)}: ${problem}`],
  );
};

const checkInspectorPanel = (ext: Loose): string[] => {
  const panel = visualisationOf(ext)?.inspectorPanel;
  return panel === undefined || isLazyComponent(panel)
    ? []
    : ['visualisation.inspectorPanel must be a React.lazy component'];
};

/** Heavy code stays out of the host's entry chunk (goal 4). */
const checkLaziness = (ext: Loose): string[] => [
  ...ELEMENT_LISTS.flatMap((label) =>
    checkEntries(
      ext,
      listSpec(label),
      'element',
      'element must be a React.lazy component',
    ),
  ),
  ...LOADER_LISTS.flatMap((label) =>
    checkEntries(
      ext,
      listSpec(label),
      'load',
      'load must be a zero-argument function returning import()',
    ),
  ),
  ...checkInspectorPanel(ext),
];

export default checkLaziness;
