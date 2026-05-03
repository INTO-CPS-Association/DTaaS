import '@testing-library/jest-dom';
import { screen, fireEvent, act, cleanup } from '@testing-library/react';
import SettingsForm from 'route/account/SettingsForm';
import {
  DEFAULT_SETTINGS,
  DEFAULT_MEASUREMENT,
  setTrials,
  setSecondaryRunnerTag,
  setPrimaryDTName,
  setSecondaryDTName,
} from 'store/settings.slice';
import { renderWithRouter } from 'test/unit/unit.testUtil';
import setupSettingsFormTest from 'test/unit/routes/settingsForm.testSetup';

jest.mock('routes', () => ({ __esModule: true, default: [] }));

jest.mock('model/backend/util/init', () => ({
  fetchDigitalTwins: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.useFakeTimers();

describe('SettingsForm - measurement and DT fields', () => {
  let mockDispatch: jest.Mock;
  let mockedUseSelector: jest.Mock;

  afterEach(cleanup);

  beforeEach(() => {
    ({ mockDispatch, mockedUseSelector } = setupSettingsFormTest());
    renderWithRouter(<SettingsForm />, { route: '/private' });
  });

  it('dispatches setTrials when trials value changes', () => {
    const input = screen.getByLabelText(/trial number/i);
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockDispatch).toHaveBeenCalledWith(setTrials(5));
  });

  it('dispatches setSecondaryRunnerTag when secondary runner tag changes', () => {
    const input = screen.getByLabelText(/measurement secondary runner tag/i);
    fireEvent.change(input, { target: { value: 'macos' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockDispatch).toHaveBeenCalledWith(setSecondaryRunnerTag('macos'));
  });

  it('shows error when secondary runner tag is empty', () => {
    const input = screen.getByLabelText(/measurement secondary runner tag/i);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(
      screen.getByText('Measurement secondary runner tag is required'),
    ).toBeInTheDocument();
  });

  it('shows error when trials field is empty', () => {
    const input = screen.getByLabelText(/trial number/i);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(screen.getByText(/trial number is required/i)).toBeInTheDocument();
  });

  it('shows error when trials value is not a number', () => {
    const input = screen.getByLabelText(/trial number/i);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(screen.getByText(/trial number is required/i)).toBeInTheDocument();
  });

  it('shows error when trials value is less than 1', () => {
    const input = screen.getByLabelText(/trial number/i);
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(screen.getByText(/trial number is required/i)).toBeInTheDocument();
  });

  describe('DT name dropdowns while twins are loading', () => {
    beforeEach(() => {
      cleanup();
      const { fetchDigitalTwins } = jest.requireMock('model/backend/util/init');
      fetchDigitalTwins.mockReturnValueOnce(new Promise(() => {}));
      mockedUseSelector.mockImplementation((selector) =>
        selector({
          settings: { ...DEFAULT_SETTINGS, ...DEFAULT_MEASUREMENT },
          digitalTwin: { digitalTwin: {} },
        }),
      );
      renderWithRouter(<SettingsForm />, { route: '/private' });
    });

    it('disables both DT dropdowns', () => {
      expect(screen.getByLabelText(/primary digital twin/i)).toBeDisabled();
      expect(screen.getByLabelText(/secondary digital twin/i)).toBeDisabled();
    });

    it('shows saved values as placeholder options', () => {
      expect(
        screen.getByRole('option', { name: DEFAULT_MEASUREMENT.primaryDTName }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', {
          name: DEFAULT_MEASUREMENT.secondaryDTName,
        }),
      ).toBeInTheDocument();
    });

    it('enables dropdowns after fetch completes', async () => {
      let resolve!: () => void;
      const promise = new Promise<void>((res) => {
        resolve = res;
      });
      const { fetchDigitalTwins } = jest.requireMock('model/backend/util/init');
      fetchDigitalTwins.mockReturnValueOnce(promise);

      cleanup();
      renderWithRouter(<SettingsForm />, { route: '/private' });

      expect(screen.getByLabelText(/primary digital twin/i)).toBeDisabled();

      await act(async () => {
        resolve();
        await promise;
      });

      expect(screen.getByLabelText(/primary digital twin/i)).not.toBeDisabled();
      expect(
        screen.getByLabelText(/secondary digital twin/i),
      ).not.toBeDisabled();
    });
  });

  it('renders twin names as options in the primary DT dropdown', () => {
    expect(
      screen.getAllByRole('option', {
        name: DEFAULT_MEASUREMENT.primaryDTName,
      }),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByRole('option', {
        name: DEFAULT_MEASUREMENT.secondaryDTName,
      }),
    ).not.toHaveLength(0);
  });

  it('dispatches setPrimaryDTName when a different twin is selected', () => {
    const select = screen.getByLabelText(/primary digital twin/i);
    fireEvent.change(select, {
      target: { value: DEFAULT_MEASUREMENT.secondaryDTName },
    });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockDispatch).toHaveBeenCalledWith(
      setPrimaryDTName(DEFAULT_MEASUREMENT.secondaryDTName),
    );
  });

  it('dispatches setSecondaryDTName when a different twin is selected', () => {
    const select = screen.getByLabelText(/secondary digital twin/i);
    fireEvent.change(select, {
      target: { value: DEFAULT_MEASUREMENT.primaryDTName },
    });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockDispatch).toHaveBeenCalledWith(
      setSecondaryDTName(DEFAULT_MEASUREMENT.primaryDTName),
    );
  });
});
