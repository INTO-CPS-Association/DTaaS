import type { AssetsState } from 'model/store/assets.slice';
import type {
  FileState,
  LibraryConfigFile,
} from 'model/backend/interfaces/sharedInterfaces';
import type { ExecutionHistoryState } from 'model/backend/state/executionHistory.slice';

export type AssetsStoreSlice = { assets: AssetsState };
export type FilesStoreSlice = { files: FileState[] };
export type LibraryConfigFilesStoreSlice = {
  libraryConfigFiles: LibraryConfigFile[];
};
export type ExecutionHistoryStoreSlice = {
  executionHistory: ExecutionHistoryState;
};
