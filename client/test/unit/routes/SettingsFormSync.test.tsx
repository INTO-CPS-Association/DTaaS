import '@testing-library/jest-dom';
import { cleanup, waitFor } from '@testing-library/react';
import { useSelector, useDispatch } from 'react-redux';
import SettingsForm from 'route/account/SettingsForm';
import { DEFAULT_SETTINGS, DEFAULT_MEASUREMENT } from 'store/settings.slice';
import { renderWithRouter } from 'test/unit/unit.testUtil';

jest.mock('routes', () => ({ __esModule: true, default: [] }));

jest.mock('model/backend/util/init', () => ({
  fetchDigitalTwins: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

describe('SettingsForm digital twin synchronization', () => {
  afterEach(cleanup);

  function renderWithMissingTwin(field: string) {
    const mockedUseSelector = useSelector as unknown as jest.Mock;
    mockedUseSelector.mockImplementation((selector) =>
      selector({
        settings: {
          ...DEFAULT_SETTINGS,
          ...DEFAULT_MEASUREMENT,
          [field]: 'non-existent-dt',
        },
        digitalTwin: {
          digitalTwin: {
            'available-dt-1': {},
            'available-dt-2': {},
          },
        },
      }),
    );

    const mockedUseDispatch = useDispatch as unknown as jest.Mock;
    const testDispatch = jest.fn();
    mockedUseDispatch.mockReturnValue(testDispatch);
    renderWithRouter(<SettingsForm />, { route: '/private' });
    return testDispatch;
  }

  it('dispatches when loaded DT names exclude the stored primary DT name', async () => {
    const testDispatch = renderWithMissingTwin('primaryDTName');

    await waitFor(() => {
      expect(testDispatch).toHaveBeenCalled();
    });
  });

  it('dispatches when loaded DT names exclude the stored secondary DT name', async () => {
    const testDispatch = renderWithMissingTwin('secondaryDTName');

    await waitFor(() => {
      expect(testDispatch).toHaveBeenCalled();
    });
  });
});
