import { FileType } from 'model/backend/interfaces/sharedInterfaces';

const FILE_TYPE_MAP: Record<string, FileType> = {
  md: FileType.DESCRIPTION,
  json: FileType.CONFIGURATION,
  yaml: FileType.CONFIGURATION,
  yml: FileType.CONFIGURATION,
};

const getFileTypeFromExtension = (fileName: string): FileType => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension && FILE_TYPE_MAP[extension]
    ? FILE_TYPE_MAP[extension]
    : FileType.LIFECYCLE;
};

export default getFileTypeFromExtension;
