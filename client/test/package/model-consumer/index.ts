// The package is installed from its generated tarball by the CI workflow.
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  formatName,
  selectExecutionHistoryById,
  selectExecutionHistoryEntries,
  selectExecutionHistoryError,
  selectSelectedExecutionId,
} from '@into-cps-association/dtaas-model';
import type { Asset } from '@into-cps-association/dtaas-model';

const label: string = formatName('example-digital-twin');
const selectors = [
  selectExecutionHistoryEntries,
  selectExecutionHistoryById,
  selectSelectedExecutionId,
  selectExecutionHistoryError,
];

export type ConsumerAsset = Asset;
export { label, selectors };
