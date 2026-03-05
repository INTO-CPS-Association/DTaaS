import DigitalTwin from 'model/backend/digitalTwin';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import {
  setDigitalTwin,
  DigitalTwinData,
} from 'model/backend/state/digitalTwin.slice';
import { extractDataFromDigitalTwin } from 'model/backend/util/digitalTwinAdapter';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';
import { previewStore } from 'test/integration/integration.testUtil';

export default function setupDigitalTwinBeforeEach(
  store: typeof previewStore,
): DigitalTwin {
  const digitalTwin = new DigitalTwin('mockedDTName', mockBackendInstance);
  (mockBackendInstance.getProjectId as jest.Mock).mockReturnValue(1234);

  const digitalTwinData: DigitalTwinData =
    extractDataFromDigitalTwin(digitalTwin);
  store.dispatch(
    setDigitalTwin({
      assetName: 'mockedDTName',
      digitalTwin: digitalTwinData,
    }),
  );

  digitalTwin.execute = jest.fn().mockImplementation(async () => {
    digitalTwin.lastExecutionStatus = ExecutionStatus.SUCCESS;
  });

  return digitalTwin;
}
