import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import ReconfigureDialog, * as Reconfigure from 'preview/route/digitaltwins/manage/ReconfigureDialog';
import * as React from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store, { RootState } from 'store/store';

import { showSnackbar } from 'preview/store/snackbar.slice';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { selectDigitalTwinByName } from 'preview/store/digitalTwin.slice';
import { selectModifiedFiles } from 'preview/store/file.slice';
import { selectModifiedLibraryFiles } from 'preview/store/libraryConfigFiles.slice';

jest.mock('preview/store/file.slice', () => ({
  ...jest.requireActual('preview/store/file.slice'),
  saveAllFiles: jest.fn().mockResolvedValue(Promise.resolve()),
}));

jest.mock('preview/store/digitalTwin.slice', () => ({
  ...jest.requireActual('preview/store/digitalTwin.slice'),
  updateDescription: jest.fn(),
}));

jest.mock('preview/store/snackbar.slice', () => ({
  ...jest.requireActual('preview/store/snackbar.slice'),
  showSnackbar: jest.fn(),
}));

jest.mock('preview/route/digitaltwins/editor/Sidebar', () => ({
  __esModule: true,
  default: () => <div>Sidebar</div>,
}));

jest.mock('preview/util/digitalTwin', () => ({
  formatName: jest.fn().mockReturnValue('TestDigitalTwin'),
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
        if (selector === selectDigitalTwinByName('mockedDTName')) {
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
            {
              name: 'newFile.md',
              content: 'New file content',
              isNew: true,
              isModified: false,
            },
          ].filter((file) => !file.isNew);
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
    jest.clearAllMocks();
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
    const saveButton = screen.getByRole('button', { name: /Save/i });

    mockDigitalTwin.DTAssets.updateFileContent = jest
      .fn()
      .mockRejectedValueOnce(new Error('Error updating file'));

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

  it('should not return new files from modified files', async () => {
    const modifiedFiles = useSelector((state: RootState) =>
      state.files.filter((file) => !file.isNew),
    );

    await waitFor(() => {
      expect(modifiedFiles).not.toContainEqual(
        expect.objectContaining({ name: 'newFile.md' }),
      );
    });
  });
});
