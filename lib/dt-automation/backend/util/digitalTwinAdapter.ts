import DigitalTwin from 'model/backend/digitalTwin';
import { DigitalTwinData } from 'model/backend/state/digitalTwin.slice';
import { initDigitalTwin } from 'model/backend/util/init';

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

  if (digitalTwinData.pipelineId) {
    digitalTwinInstance.pipelineId = digitalTwinData.pipelineId;
  }
  if (digitalTwinData.currentExecutionId) {
    digitalTwinInstance.currentExecutionId = digitalTwinData.currentExecutionId;
  }
  if (digitalTwinData.lastExecutionStatus) {
    digitalTwinInstance.lastExecutionStatus =
      digitalTwinData.lastExecutionStatus;
  }

  digitalTwinInstance.jobLogs = digitalTwinData.jobLogs || [];
  digitalTwinInstance.pipelineLoading = digitalTwinData.pipelineLoading;
  digitalTwinInstance.pipelineCompleted = digitalTwinData.pipelineCompleted;
  digitalTwinInstance.description = digitalTwinData.description;

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
