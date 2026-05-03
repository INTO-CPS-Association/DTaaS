import { DEFAULT_SETTINGS, DEFAULT_MEASUREMENT } from 'store/settings.slice';
import { useSelector, useDispatch } from 'react-redux';

export default function setupSettingsFormTest() {
  const mockDispatch = jest.fn();
  const mockedUseSelector = useSelector as unknown as jest.Mock;
  const mockedUseDispatch = useDispatch as unknown as jest.Mock;

  mockDispatch.mockClear();
  mockedUseSelector.mockImplementation((selector) =>
    selector({
      settings: { ...DEFAULT_SETTINGS, ...DEFAULT_MEASUREMENT },
      digitalTwin: {
        digitalTwin: {
          [DEFAULT_MEASUREMENT.primaryDTName]: {},
          [DEFAULT_MEASUREMENT.secondaryDTName]: {},
        },
      },
    }),
  );
  mockedUseDispatch.mockReturnValue(mockDispatch);

  return { mockDispatch, mockedUseSelector, mockedUseDispatch };
}
