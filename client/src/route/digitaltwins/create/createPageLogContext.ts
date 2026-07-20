import { FileState, FileType } from 'model/backend/interfaces/sharedInterfaces';
import type { LogContext } from 'util/logger/logEvent';

export const buildAssetsLogContext = (
  newDigitalTwinName: string,
  files: FileState[],
): LogContext => {
  const namesByType = (type: FileType) =>
    files
      .filter((file) => file.isNew && file.type === type)
      .map((file) => file.name);

  return {
    dt: {
      name: newDigitalTwinName,
      assets: {
        description: namesByType(FileType.DESCRIPTION),
        configuration: namesByType(FileType.CONFIGURATION),
        lifecycle: namesByType(FileType.LIFECYCLE),
      },
    },
  };
};

export const buildActionLogContext = (
  logContext: LogContext,
  button: string,
): LogContext => ({
  ...logContext,
  dt: { ...(logContext.dt as LogContext), button },
});
