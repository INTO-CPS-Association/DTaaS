import digitalTwinReducer, {
  setDigitalTwin,
  setPipelineCompleted,
  setPipelineLoading,
  updateDescription,
} from 'model/backend/state/digitalTwin.slice';
import { extractDataFromDigitalTwin } from 'model/backend/util/digitalTwinAdapter';
import DigitalTwin from 'model/backend/digitalTwin';
import { createGitlabInstance } from 'model/backend/gitlab/gitlabFactory';

describe('digitalTwin reducer', () => {
  const digitalTwinInitialState = {
    digitalTwin: {},
    shouldFetchDigitalTwins: true,
  };

  const createTestDigitalTwin = (name: string = 'asset1') =>
    new DigitalTwin(
      name,
      createGitlabInstance('user1', 'token1', 'mockAuthority'),
    );

  it('should return the initial state when an unknown action is passed', () => {
    expect(digitalTwinReducer(undefined, { type: 'unknown' })).toEqual(
      digitalTwinInitialState,
    );
  });

  it('should handle setDigitalTwin', () => {
    const digitalTwin = createTestDigitalTwin();
    const newState = digitalTwinReducer(
      digitalTwinInitialState,
      setDigitalTwin({
        assetName: 'asset1',
        digitalTwin: extractDataFromDigitalTwin(digitalTwin),
      }),
    );
    const expectedData = extractDataFromDigitalTwin(digitalTwin);
    const actualData = newState.digitalTwin.asset1;

    expect(actualData.DTName).toEqual(expectedData.DTName);
    expect(actualData.description).toEqual(expectedData.description);
    expect(actualData.pipelineId).toEqual(expectedData.pipelineId);
    expect(actualData.lastExecutionStatus).toEqual(
      expectedData.lastExecutionStatus,
    );
    expect(actualData.jobLogs).toEqual(expectedData.jobLogs);
    expect(actualData.pipelineCompleted).toEqual(
      expectedData.pipelineCompleted,
    );
    expect(actualData.pipelineLoading).toEqual(expectedData.pipelineLoading);
    expect(actualData.currentExecutionId).toEqual(
      expectedData.currentExecutionId,
    );
  });

  it('should handle setPipelineCompleted', () => {
    const updatedDigitalTwin = createTestDigitalTwin();
    updatedDigitalTwin.pipelineCompleted = false;

    const updatedState = {
      digitalTwin: { asset1: extractDataFromDigitalTwin(updatedDigitalTwin) },
      shouldFetchDigitalTwins: true,
    };

    const newState = digitalTwinReducer(
      updatedState,
      setPipelineCompleted({ assetName: 'asset1', pipelineCompleted: true }),
    );

    expect(newState.digitalTwin.asset1.pipelineCompleted).toBe(true);
  });

  it('should handle setPipelineLoading', () => {
    const updatedDigitalTwin = createTestDigitalTwin();
    updatedDigitalTwin.pipelineLoading = false;

    const updatedState = {
      ...digitalTwinInitialState,
      digitalTwin: { asset1: extractDataFromDigitalTwin(updatedDigitalTwin) },
    };

    const newState = digitalTwinReducer(
      updatedState,
      setPipelineLoading({ assetName: 'asset1', pipelineLoading: true }),
    );

    expect(newState.digitalTwin.asset1.pipelineLoading).toBe(true);
  });

  it('should handle updateDescription', () => {
    const updatedDigitalTwin = createTestDigitalTwin();
    updatedDigitalTwin.description = '';

    const updatedState = {
      ...digitalTwinInitialState,
      digitalTwin: { asset1: extractDataFromDigitalTwin(updatedDigitalTwin) },
    };

    const description = 'new description';
    const newState = digitalTwinReducer(
      updatedState,
      updateDescription({ assetName: 'asset1', description }),
    );

    expect(newState.digitalTwin.asset1.description).toBe(description);
  });
});
