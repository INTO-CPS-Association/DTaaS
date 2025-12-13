import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import ReconfigureDialog, * as Reconfigure from 'preview/route/digitaltwins/manage/ReconfigureDialog';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store, { RootState } from 'store/store';

import { showSnackbar } from 'store/snackbar.slice';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';
import { selectModifiedFiles } from 'preview/store/file.slice';
import { selectModifiedLibraryFiles } from 'preview/store/libraryConfigFiles.slice';

import * as digitalTwinSlice from 'model/backend/state/digitalTwin.slice';
import * as snackbarSlice from 'store/snackbar.slice';

jest.mock('preview/store/file.slice', () => {
  const actual = jest.requireActual('preview/store/file.slice');
  return {
    ...actual,
    selectModifiedFiles: jest.fn(),
    default: actual.default, // ensure the reducer is not mocked
  };
});
jest.mock('model/backend/state/digitalTwin.slice', () => {
  const actual = jest.requireActual('model/backend/state/digitalTwin.slice');
  return {
    ...actual,
    updateDescription: jest.fn(),
    selectDigitalTwinByName: jest.fn(),
    default: actual.default, // ensure the reducer is not mocked
  };
});
jest.mock('store/snackbar.slice', () => {
  const actual = jest.requireActual('store/snackbar.slice');
  return {
    ...actual,
    showSnackbar: jest.fn(),
    hideSnackbar: jest.fn(),
    default: actual.default,
  };
});

(digitalTwinSlice.updateDescription as unknown as jest.Mock) = jest.fn();
(snackbarSlice.showSnackbar as unknown as jest.Mock) = jest.fn();

jest.mock('preview/route/digitaltwins/editor/Sidebar', () => ({
  __esModule: true,
  default: () => <div>Sidebar</div>,
}));

jest.mock('model/backend/digitalTwin', () => ({
  formatName: jest.fn().mockReturnValue('TestDigitalTwin'),
}));

jest.mock('model/backend/util/digitalTwinAdapter', () => ({
  createDigitalTwinFromData: jest.fn().mockResolvedValue({
    DTName: 'TestDigitalTwin',
    DTAssets: {
      updateFileContent: jest.fn().mockResolvedValue(undefined),
      updateLibraryFileContent: jest.fn().mockResolvedValue(undefined),
    },
  }),
}));

describe('ReconfigureDialog', () => {
  const setShowDialog = jest.fn();
  const name = 'TestDigitalTwin';

  beforeEach(() => {
    const dispatch = jest.fn();
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      dispatch,
    );

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: RootState) => unknown) => {
        if (selector === selectDigitalTwinByName('TestDigitalTwin')) {
          return mockDigitalTwin;
        }
        if (selector === selectModifiedFiles) {
          return [
            {
              name: 'description.md',
              content: 'Updated description',
              isNew: false,
              isModified: true,
            },
            {
              name: 'lifecycle.md',
              content: 'Updated lifecycle',
              isNew: false,
              isModified: true,
            },
          ];
        }
        if (selector === selectModifiedLibraryFiles) {
          return [
            {
              name: 'libraryFile.md',
              content: 'Updated library file',
              isNew: false,
              isModified: true,
            },
          ];
        }
        return mockDigitalTwin;
      },
    );

    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={setShowDialog}
          name={name}
        />
      </Provider>,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the Reconfigure dialog', () => {
    expect(screen.getByText('Reconfigure')).toBeInTheDocument();
  });

  it('handles close dialog', async () => {
    const closeButton = screen.getByRole('button', { name: /Cancel/i });

    act(() => {
      fireEvent.click(closeButton);
    });

    expect(
      screen.getByText(
        'Are you sure you want to cancel? Changes will not be applied.',
      ),
    ).toBeInTheDocument();

    const yesButton = screen.getByRole('button', { name: /Yes/i });
    act(() => {
      fireEvent.click(yesButton);
    });

    await waitFor(() => {
      expect(setShowDialog).toHaveBeenCalledWith(false);
    });
  });

  it('calls handleCloseLog when the close function is called', async () => {
    await act(async () => {
      await Reconfigure.handleCloseReconfigureDialog(setShowDialog);
    });

    expect(setShowDialog).toHaveBeenCalledWith(false);
  });

  it('handles save dialog', async () => {
    const saveButton = screen.getByRole('button', { name: /Save/i });

    act(() => {
      saveButton.click();
    });

    expect(
      screen.getByText('Are you sure you want to apply the changes?'),
    ).toBeInTheDocument();

    const yesButton = screen.getByRole('button', { name: /Yes/i });

    act(() => {
      yesButton.click();
    });

    await waitFor(() => {
      expect(setShowDialog).toHaveBeenCalledWith(false);
    });
  });

  it('should update file content and dispatch updateDescription for description.md', async () => {
    const dispatch = jest.fn();
    const descriptionFile = {
      name: 'description.md',
      content: 'Updated description',
      isNew: false,
      isModified: true,
    };

    mockDigitalTwin.DTAssets.updateFileContent = jest
      .fn()
      .mockResolvedValue(Promise.resolve());

    await Reconfigure.handleFileUpdate(
      descriptionFile,
      mockDigitalTwin,
      dispatch,
    );
  });

  it('shows error snackbar on file update failure', async () => {
    const dispatch = useDispatch();

    (createDigitalTwinFromData as jest.Mock).mockResolvedValueOnce({
      DTName: 'TestDigitalTwin',
      DTAssets: {
        updateFileContent: jest
          .fn()
          .mockRejectedValue(new Error('Error updating file')),
        updateLibraryFileContent: jest.fn().mockResolvedValue(undefined),
      },
    });

    const saveButton = screen.getByRole('button', { name: /Save/i });

    act(() => {
      saveButton.click();
    });

    const yesButton = screen.getByRole('button', { name: /Yes/i });
    act(() => {
      yesButton.click();
    });

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        showSnackbar({
          message: 'Error updating file description.md: Error updating file',
          severity: 'error',
        }),
      );
    });
  });

  it('saves changes and calls handleFileUpdate for each modified file', async () => {
    const handleFileUpdateSpy = jest.spyOn(Reconfigure, 'handleFileUpdate');

    (createDigitalTwinFromData as jest.Mock).mockResolvedValue({
      DTName: 'TestDigitalTwin',
      DTAssets: {
        updateFileContent: jest.fn().mockResolvedValue(undefined),
        updateLibraryFileContent: jest.fn().mockResolvedValue(undefined),
      },
    });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    act(() => {
      saveButton.click();
    });

    const yesButton = screen.getByRole('button', { name: /Yes/i });
    act(() => {
      yesButton.click();
    });

    await waitFor(() => {
      expect(handleFileUpdateSpy).toHaveBeenCalledTimes(3);
    });
  });

  it('should not return new files from modified files', () => {
    const testFiles = [
      {
        name: 'description.md',
        content: 'Updated description',
        isNew: false,
        isModified: true,
      },
      {
        name: 'lifecycle.md',
        content: 'Updated lifecycle',
        isNew: false,
        isModified: true,
      },
    ];

    expect(testFiles).toEqual(
      expect.arrayContaining([expect.objectContaining({ isNew: false })]),
    );
    expect(testFiles.every((file) => !file.isNew)).toBe(true);
    expect(testFiles).not.toContainEqual(
      expect.objectContaining({ name: 'newFile.md' }),
    );
  });
});
