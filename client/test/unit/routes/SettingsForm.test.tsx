import {
  screen,
  fireEvent,
  act,
  waitFor,
  within,
} from '@testing-library/react';
import SettingsForm from 'route/account/SettingsForm';
import {
  DEFAULT_SETTINGS,
  setGroupName,
  resetToDefaults,
  setCommonLibraryProjectName,
  setDTDirectory,
  setRunnerTag,
  setBranchName,
} from 'store/settings.slice';
import { useSelector, useDispatch } from 'react-redux';
import { renderWithRouter } from 'test/unit/unit.testUtil';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.useFakeTimers();

const mockedUseSelector = useSelector as unknown as jest.Mock;
const mockedUseDispatch = useDispatch as unknown as jest.Mock;

describe('SettingsForm', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    mockedUseSelector.mockImplementation((selector) =>
      selector({ settings: DEFAULT_SETTINGS }),
    );
    mockedUseDispatch.mockReturnValue(mockDispatch);
    renderWithRouter(<SettingsForm />, { route: '/private' });
  });

  it('renders form fields', () => {
    expect(screen.getByLabelText(/group name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dt directory/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/common library/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/runner tag/i)).toBeInTheDocument();
  });

  it('updates local state on input change', () => {
    const input = screen.getByLabelText(/group name/i);
    fireEvent.change(input, { target: { value: 'new-group' } });
    expect(input).toHaveValue('new-group');
  });

  it('saves settings when save button clicked', () => {
    // Change form fields
    let input = screen.getByLabelText(/group name/i);
    fireEvent.change(input, { target: { value: 'new-group' } });
    input = screen.getByLabelText(/common library project name/i);
    fireEvent.change(input, { target: { value: 'new-common-library' } });
    input = screen.getByLabelText(/dt directory/i);
    fireEvent.change(input, { target: { value: 'new-dt-directory' } });
    input = screen.getByLabelText(/runner tag/i);
    fireEvent.change(input, { target: { value: 'new-runner-tag' } });
    input = screen.getByLabelText(/branch name/i);
    fireEvent.change(input, { target: { value: 'new-branch-name' } });

    // Click the save settings button
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    // Dispatch has been called with the new values
    expect(mockDispatch).toHaveBeenCalledWith(setGroupName('new-group'));
    expect(mockDispatch).toHaveBeenCalledWith(
      setCommonLibraryProjectName('new-common-library'),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setDTDirectory('new-dt-directory'),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setRunnerTag('new-runner-tag'));
    expect(mockDispatch).toHaveBeenCalledWith(setBranchName('new-branch-name'));
  });

  it('shows success notification after save and auto-hides', async () => {
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(
      await screen.findByText(/settings saved successfully/i),
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    await waitFor(() =>
      expect(
        screen.queryByText(/settings saved successfully/i),
      ).not.toBeInTheDocument(),
    );
  });

  it('close button hides the notification immediately', async () => {
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    const alert = await screen.findByRole('alert');

    const closeButton = within(alert).getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
  });

  it('only dispatches actions for changed fields', () => {
    fireEvent.change(screen.getByLabelText(/group name/i), {
      target: { value: 'new-group' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockDispatch).toHaveBeenCalledWith(setGroupName('new-group'));
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringMatching(
          /setDTDirectory|setCommonLibraryProjectName|setRunnerTag/,
        ),
      }),
    );
  });

  it('resets to defaults when reset button clicked', () => {
    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));

    expect(mockDispatch).toHaveBeenCalledWith(resetToDefaults());
  });
});
