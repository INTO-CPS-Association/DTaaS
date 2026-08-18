import type { AssetsState } from 'src/store/assets.slice';
import type {
  FileState,
  LibraryConfigFile,
} from 'src/interfaces/sharedInterfaces';
import type { ExecutionHistoryState } from 'src/state/executionHistory.slice';

export type AssetsStoreSlice = { assets: AssetsState };
export type FilesStoreSlice = { files: FileState[] };
export type LibraryConfigFilesStoreSlice = {
  libraryConfigFiles: LibraryConfigFile[];
};
export type ExecutionHistoryStoreSlice = {
  executionHistory: ExecutionHistoryState;
};
