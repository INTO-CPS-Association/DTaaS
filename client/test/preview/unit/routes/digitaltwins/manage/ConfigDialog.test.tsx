import { act, render, screen, waitFor } from '@testing-library/react';
import ReconfigureDialog, * as Reconfigure from 'preview/route/digitaltwins/manage/ReconfigureDialog';
import * as React from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from 'store/store';
import { getModifiedFiles } from 'preview/store/file.slice';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('preview/store/file.slice', () => ({
  ...jest.requireActual('preview/store/file.slice'),
  saveAllFiles: jest.fn().mockResolvedValue(Promise.resolve()),
  getModifiedFiles: jest.fn(),
}));

jest.mock('preview/store/snackbar.slice', () => ({
  ...jest.requireActual('preview/store/snackbar.slice'),
  showSnackbar: jest.fn(),
}));

jest.mock('preview/route/digitaltwins/editor/Sidebar', () => ({
  __esModule: true,
  default: () => <div>Sidebar</div>,
}));

jest.mock('preview/util/gitlabDigitalTwin', () => ({
  formatName: jest.fn().mockReturnValue('TestDigitalTwin'),
}));

describe('ReconfigureDialog', () => {
  const setShowLog = jest.fn();
  const name = 'TestDigitalTwin';
  const modifiedFiles = [
    { name: 'file1.md', content: 'Content for file 1' },
    { name: 'description.md', content: 'Updated description' },
  ];

  beforeEach(() => {
    const dispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(dispatch);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === getModifiedFiles) {
        return modifiedFiles;
      }
      return null;
    });

    render(
      <Provider store={store}>
        <ReconfigureDialog showLog={true} setShowLog={setShowLog} name={name} />
      </Provider>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Reconfigure dialog', () => {
    expect(screen.getByText('Reconfigure')).toBeInTheDocument();
  });

  it('handles close dialog', async () => {
    const closeButton = screen.getByRole('button', { name: /Cancel/i });
    act(() => {
      closeButton.click();
    });
    expect(
      screen.getByText(
        'Are you sure you want to cancel? Changes will not be applied.',
      ),
    ).toBeInTheDocument();
    const yesButton = screen.getByRole('button', { name: /Yes/i });
    act(() => {
      yesButton.click();
    });
    await waitFor(() => {
      expect(setShowLog).toHaveBeenCalledWith(false);
    });
  });

  it('calls handleCloseLog when the close function is called', async () => {
    await act(async () => {
      await Reconfigure.handleCloseLog(setShowLog);
    });

    expect(setShowLog).toHaveBeenCalledWith(false);
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
      expect(setShowLog).toHaveBeenCalledWith(false);
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
      expect(handleFileUpdateSpy).toHaveBeenCalledTimes(modifiedFiles.length);
    });
  });

  it('should update file content and dispatch updateDescription for description.md', async () => {
    const dispatch = jest.fn();
    const descriptionFile = {
      name: 'description.md',
      content: 'Updated description',
      isModified: true,
    };

    mockDigitalTwin.updateFileContent = jest
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

    mockDigitalTwin.updateFileContent = jest
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
});
