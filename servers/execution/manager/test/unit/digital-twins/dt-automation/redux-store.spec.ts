import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import InMemoryExecutionHistory from 'src/digital-twins/dt-automation/in-memory-execution-history.js';

const actual = await import('@into-cps-association/dt-automation');
const fetchDigitalTwins = jest.fn<typeof actual.fetchDigitalTwins>();
jest.unstable_mockModule('@into-cps-association/dt-automation', () => ({
  ...actual,
  fetchDigitalTwins,
}));

const { default: ReduxStore } =
  await import('src/digital-twins/dt-automation/redux-store.js');

function gitlabLists(...names: string[]): void {
  fetchDigitalTwins.mockImplementationOnce(async (dispatch) => {
    for (const name of names) {
      const digitalTwin = {
        DTName: name,
        description: `About ${name}`,
        fullDescription: `# ${name}`,
        jobLogs: [],
        pipelineCompleted: false,
        pipelineLoading: false,
      };
      dispatch(actual.setDigitalTwin({ assetName: name, digitalTwin }));
    }
  });
}

describe('ReduxStore', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('listing the digital twins', () => {
    it('returns only the digital twins of this listing', async () => {
      const store = new ReduxStore();
      gitlabLists('hello-world', 'other');
      await store.listDigitalTwins();

      gitlabLists('hello-world');

      expect(await store.listDigitalTwins()).toEqual({
        digitalTwins: [
          expect.objectContaining({
            DTName: 'hello-world',
            description: 'About hello-world',
          }),
        ],
        error: null,
      });
    });

    it('returns the failure the package reports', async () => {
      fetchDigitalTwins.mockImplementationOnce(async (_dispatch, setError) => {
        setError('An error occurred while fetching assets: 401');
      });

      expect(await new ReduxStore().listDigitalTwins()).toEqual({
        digitalTwins: [],
        error: 'An error occurred while fetching assets: 401',
      });
    });
  });

  describe('the executions in the store', () => {
    const completed = {
      id: 'e-1',
      dtName: 'hello-world',
      pipelineId: 42,
      timestamp: 1,
      status: actual.ExecutionStatus.COMPLETED,
      jobLogs: [{ jobName: 'execute', log: 'done' }],
    };

    // The package loads the executions from the history it was given.
    async function storeWithHistory() {
      const history = new InMemoryExecutionHistory();
      actual.setStorageService(history);
      await history.add(completed);
      await history.add({ ...completed, id: 'e-2', dtName: 'other' });
      return new ReduxStore();
    }

    it("loads one digital twin's executions and tells the subscribers", async () => {
      const store = await storeWithHistory();
      const listener = jest.fn();
      store.subscribe(listener);

      await store.loadExecutionHistory('hello-world');

      expect(store.executions()).toEqual([
        expect.objectContaining({ id: 'e-1', status: 'completed' }),
      ]);
      expect(listener).toHaveBeenCalled();
    });

    it('leaves the finished executions alone when it checks the running ones', async () => {
      const store = await storeWithHistory();
      await store.loadExecutionHistory('hello-world');

      await store.checkRunningExecutions();

      expect(store.executions()).toEqual([
        expect.objectContaining({ id: 'e-1', status: 'completed' }),
      ]);
    });
  });
});
