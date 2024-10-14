import assetsSlice, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
} from 'preview/store/digitalTwin.slice';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';
import GitlabInstance from 'preview/util/gitlab';
import { JobLog } from 'preview/components/asset/StartStopButton';
import { Asset } from 'preview/components/asset/Asset';
import snackbarSlice, {
  hideSnackbar,
  showSnackbar,
} from 'preview/store/snackbar.slice';
import { AlertColor } from '@mui/material';

describe('reducers', () => {
  let initialState: {
    assets: {
      items: Asset[];
    };
    digitalTwin: {
      [key: string]: DigitalTwin;
    };
    snackbar: {
      open: boolean;
      message: string;
      severity: AlertColor;
    };
  };

  beforeEach(() => {
    initialState = {
      assets: { items: [] },
      digitalTwin: {},
      snackbar: {
        open: false,
        message: '',
        severity: 'info',
      },
    };
  });

  describe('assets reducer', () => {
    it('should handle setAssets', () => {
      const asset1 = {
        name: 'asset1',
        description: 'description',
        path: 'path',
      };

      const newState = assetsSlice(initialState.assets, setAssets([asset1]));

      expect(newState.items).toEqual([asset1]);
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

  describe('snackbar reducer', () => {
    it('should handle showSnackbar', () => {
      const message = 'message';
      const severity = 'error';
      const newState = snackbarSlice(
        initialState.snackbar,
        showSnackbar({ message, severity }),
      );
      expect(newState.open).toBe(true);
      expect(newState.message).toBe(message);
      expect(newState.severity).toBe(severity);
    });

    it('should handle hideSnackbar', () => {
      initialState.snackbar.open = true;
      initialState.snackbar.message = 'message';
      initialState.snackbar.severity = 'error';
      const newState = snackbarSlice(initialState.snackbar, hideSnackbar());
      expect(newState.open).toBe(false);
      expect(newState.message).toBe('');
      expect(newState.severity).toBe('info');
    });
  });
});
