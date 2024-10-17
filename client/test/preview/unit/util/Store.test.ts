import assetsSlice, {
  deleteAsset,
  setAssets,
} from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
  updateDescription,
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
import fileSlice, {
  addOrUpdateFile,
  getModifiedFiles,
  saveAllFiles,
} from 'preview/store/file.slice';

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
    files: {
      name: string;
      content: string;
      isModified: boolean;
    }[];
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
      files: [],
    };
  });

  describe('assets reducer', () => {
    const asset1 = {
      name: 'asset1',
      description: 'description',
      path: 'path',
    };

    it('should handle setAssets', () => {
      const newState = assetsSlice(initialState.assets, setAssets([asset1]));

      expect(newState.items).toEqual([asset1]);
    });

    it('should handle deleteAsset', () => {
      initialState.assets.items = [asset1];
      const newState = assetsSlice(initialState.assets, deleteAsset('path'));

      expect(newState.items).toEqual([]);
    });
  });

  describe('digitalTwin reducer', () => {
    const digitalTwin = new DigitalTwin(
      'asset1',
      new GitlabInstance('user1', 'authority', 'token1'),
    );

    it('digitalTwinReducer should return the initial digitalTwin state when an unknown action type is passed with an undefined state', () => {
      expect(digitalTwinReducer(undefined, { type: 'unknown' })).toEqual(
        initialState.digitalTwin,
      );
    });

    it('should handle setDigitalTwin', () => {
      const newState = digitalTwinReducer(
        initialState.digitalTwin,
        setDigitalTwin({ assetName: 'asset1', digitalTwin }),
      );
      expect(newState.asset1).toEqual(digitalTwin);
    });

    it('should handle setJobLogs', () => {
      const jobLogs: JobLog[] = [{ jobName: 'job1', log: 'log' }];
      digitalTwin.jobLogs = jobLogs;
      initialState.digitalTwin.asset1 = digitalTwin;
      const newState = digitalTwinReducer(
        initialState.digitalTwin,
        setJobLogs({ assetName: 'asset1', jobLogs }),
      );
      expect(newState.asset1.jobLogs).toEqual(jobLogs);
    });

    it('should handle setPipelineCompleted', () => {
      initialState.digitalTwin.asset1 = digitalTwin;
      const newState = digitalTwinReducer(
        initialState.digitalTwin,
        setPipelineCompleted({ assetName: 'asset1', pipelineCompleted: true }),
      );
      expect(newState.asset1.pipelineCompleted).toBe(true);
    });

    it('should handle setPipelineLoading', () => {
      initialState.digitalTwin.asset1 = digitalTwin;
      const newState = digitalTwinReducer(
        initialState.digitalTwin,
        setPipelineLoading({ assetName: 'asset1', pipelineLoading: true }),
      );
      expect(newState.asset1.pipelineLoading).toBe(true);
    });

    it('should handle updateDescription', () => {
      initialState.digitalTwin.asset1 = digitalTwin;
      const description = 'new description';
      const newState = digitalTwinReducer(
        initialState.digitalTwin,
        updateDescription({ assetName: 'asset1', description }),
      );
      expect(newState.asset1.description).toBe(description);
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

  describe('file reducer', () => {
    const file1 = {
      name: 'fileName',
      content: 'fileContent',
      isModified: true,
    };

    const file2 = {
      name: 'fileName2',
      content: 'fileContent2',
      isModified: true,
    };

    it('should handle addOrUpdateFile', () => {
      const newState = fileSlice(initialState.files, addOrUpdateFile(file1));
      expect(newState).toEqual([file1]);
    });

    it('should handle addOrUpdateFile when file already exists', () => {
      const file1Updated = {
        name: 'fileName',
        content: 'newContent',
        isModified: true,
      };
      initialState.files = [file1];
      const newState = fileSlice(
        initialState.files,
        addOrUpdateFile(file1Updated),
      );
      expect(newState).toEqual([file1Updated]);
    });

    it('should handle saveAllFiles', () => {
      initialState.files = [file1, file2];
      const newState = fileSlice(initialState.files, saveAllFiles());
      expect(newState).toEqual([]);
    });

    it('should getModifiedFiles', () => {
      initialState.files = [file1, file2];
      const getModifiedFilesSelector = getModifiedFiles(initialState.files);
      expect(getModifiedFilesSelector).toEqual([file1, file2]);
    });
  });
});
