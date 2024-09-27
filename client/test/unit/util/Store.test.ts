import menuReducer, { openMenu, closeMenu } from 'store/menu.slice';
import authReducer, { setUserName } from 'store/auth.slice';
import digitalTwinReducer, {
  setDigitalTwin,
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
} from 'store/digitalTwin.slice';
import DigitalTwin from 'util/gitlabDigitalTwin';
import GitlabInstance from 'util/gitlab';
import { JobLog } from 'preview/components/asset/StartStopButton';

describe('reducers', () => {
  let initialState: {
    menu: {
      isOpen: boolean;
    };
    auth: {
      userName: string | undefined;
    };
    digitalTwin: {
      [key: string]: DigitalTwin;
    };
  };

  beforeEach(() => {
    initialState = {
      menu: {
        isOpen: false,
      },
      auth: {
        userName: undefined,
      },
      digitalTwin: {},
    };
  });

  describe('menu reducer', () => {
    const itShouldHandleMenuActions = (
      actionCreator: () => { type: string },
      expectedValue: boolean,
    ) => {
      const newState = menuReducer(initialState.menu, actionCreator());
      expect(newState.isOpen).toBe(expectedValue);
    };

    it('menuReducer should return the initial menu state when an unknown action type is passed with an undefined state', () => {
      expect(menuReducer(undefined, { type: 'unknown' })).toEqual(
        initialState.menu,
      );
    });

    it('should handle openMenu', () => {
      itShouldHandleMenuActions(openMenu, true);
    });

    it('should handle closeMenu', () => {
      initialState.menu.isOpen = true;
      itShouldHandleMenuActions(closeMenu, false);
    });
  });

  describe('auth reducer', () => {
    it('authReducer should return the initial auth state when an unknown action type is passed with an undefined state', () => {
      expect(authReducer(undefined, { type: 'unknown' })).toEqual(
        initialState.auth,
      );
    });

    it('should handle setUserName', () => {
      const newState = authReducer(initialState.auth, setUserName('user1'));
      expect(newState.userName).toBe('user1');
    });
  });

  describe('digitalTwin reducer', () => {
    it('digitalTwinReducer should return the initial digitalTwin state when an unknown action type is passed with an undefined state', () => {
      expect(digitalTwinReducer(undefined, { type: 'unknown' })).toEqual(
        initialState.digitalTwin,
      );
    });

    it('should handle setDigitalTwin', () => {
      const digitalTwin = new DigitalTwin(
        'asset1',
        new GitlabInstance('user1', 'authority', 'token1'),
      );
      const newState = digitalTwinReducer(
        initialState.digitalTwin,
        setDigitalTwin({ assetName: 'asset1', digitalTwin }),
      );
      expect(newState.asset1).toEqual(digitalTwin);
    });

    it('should handle setJobLogs', () => {
      const jobLogs: JobLog[] = [{ jobName: 'job1', log: 'log' }];
      const digitalTwin = new DigitalTwin(
        'asset1',
        new GitlabInstance('user1', 'authority', 'token1'),
      );
      digitalTwin.jobLogs = jobLogs;
      initialState.digitalTwin.asset1 = digitalTwin;
      const newState = digitalTwinReducer(
        initialState.digitalTwin,
        setJobLogs({ assetName: 'asset1', jobLogs }),
      );
      expect(newState.asset1.jobLogs).toEqual(jobLogs);
    });

    it('should handle setPipelineCompleted', () => {
      const digitalTwin = new DigitalTwin(
        'asset1',
        new GitlabInstance('user1', 'authority', 'token1'),
      );
      initialState.digitalTwin.asset1 = digitalTwin;
      const newState = digitalTwinReducer(
        initialState.digitalTwin,
        setPipelineCompleted({ assetName: 'asset1', pipelineCompleted: true }),
      );
      expect(newState.asset1.pipelineCompleted).toBe(true);
    });

    it('should handle setPipelineLoading', () => {
      const digitalTwin = new DigitalTwin(
        'asset1',
        new GitlabInstance('user1', 'authority', 'token1'),
      );
      initialState.digitalTwin.asset1 = digitalTwin;
      const newState = digitalTwinReducer(
        initialState.digitalTwin,
        setPipelineLoading({ assetName: 'asset1', pipelineLoading: true }),
      );
      expect(newState.asset1.pipelineLoading).toBe(true);
    });
  });
});
