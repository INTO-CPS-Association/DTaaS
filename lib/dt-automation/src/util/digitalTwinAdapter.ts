import DigitalTwin from 'src/digitalTwin';
import { DigitalTwinData } from 'src/state/digitalTwin.slice';
import { initDigitalTwin } from 'src/util/init';

function copyIfPresent<Property extends keyof DigitalTwin>(
  digitalTwin: DigitalTwin,
  property: Property,
  value: DigitalTwin[Property] | undefined,
): void {
  if (value) digitalTwin[property] = value;
}

function applyDigitalTwinData(
  digitalTwin: DigitalTwin,
  digitalTwinData: DigitalTwinData,
): void {
  copyIfPresent(digitalTwin, 'pipelineId', digitalTwinData.pipelineId);
  copyIfPresent(
    digitalTwin,
    'currentExecutionId',
    digitalTwinData.currentExecutionId,
  );
  copyIfPresent(
    digitalTwin,
    'lastExecutionStatus',
    digitalTwinData.lastExecutionStatus,
  );

  digitalTwin.jobLogs = digitalTwinData.jobLogs ?? [];
  digitalTwin.pipelineLoading = digitalTwinData.pipelineLoading;
  digitalTwin.pipelineCompleted = digitalTwinData.pipelineCompleted;
  digitalTwin.description = digitalTwinData.description;
}

/**
 * Creates a DigitalTwin instance from DigitalTwinData
 * This is the way to bridge Redux state and business logic
 * @param digitalTwinData Data from Redux state
 * @param assetName Name of the digital twin asset
 * @returns DigitalTwin instance with synced state
 */
export const createDigitalTwinFromData = async (
  digitalTwinData: DigitalTwinData,
  assetName: string,
): Promise<DigitalTwin> => {
  const digitalTwinInstance = await initDigitalTwin(assetName);

  if (!digitalTwinInstance) {
    throw new Error(`Failed to initialize DigitalTwin for asset: ${assetName}`);
  }

  applyDigitalTwinData(digitalTwinInstance, digitalTwinData);

  return digitalTwinInstance;
};

/**
 * Extracts DigitalTwinData from a DigitalTwin instance
 * Used when updating Redux state from business logic operations
 * @param digitalTwin DigitalTwin instance
 * @returns DigitalTwinData for Redux state
 */
export const extractDataFromDigitalTwin = (
  digitalTwin: DigitalTwin,
): DigitalTwinData => ({
  DTName: digitalTwin.DTName,
  description: digitalTwin.description || '',
  fullDescription: digitalTwin.fullDescription || '',
  jobLogs: digitalTwin.jobLogs || [],
  pipelineCompleted: digitalTwin.pipelineCompleted,
  pipelineLoading: digitalTwin.pipelineLoading,
  pipelineId: digitalTwin.pipelineId || undefined,
  currentExecutionId: digitalTwin.currentExecutionId || undefined,
  lastExecutionStatus: digitalTwin.lastExecutionStatus || undefined,
  gitlabProjectId: digitalTwin.backend?.getProjectId() || null,
});
