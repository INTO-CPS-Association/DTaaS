import { render, screen, waitFor } from '@testing-library/react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import AssetBoard from 'components/asset/AssetBoard';
import store from 'store/store';
import { fetchDigitalTwins } from 'model/backend/util/init';

jest.mock('components/asset/AssetCardManage', () => ({
  __esModule: true,
  default: ({ onDelete }: { onDelete: () => void }) => (
    <div>
      Asset Card Manage <button onClick={onDelete}>Delete</button>
    </div>
  ),
}));

jest.mock('components/asset/AssetCard', () => ({
  AssetCardExecute: () => <div>Asset Card Execute</div>,
}));

jest.mock('model/store/assets.slice', () => ({
  ...jest.requireActual('model/store/assets.slice'),
}));

jest.mock('model/backend/util/init', () => ({
  fetchDigitalTwins: jest.fn(),
}));

const mockFetchDigitalTwins = fetchDigitalTwins as jest.MockedFunction<
  typeof fetchDigitalTwins
>;

describe('AssetBoard', () => {
  const mockDispatch = jest.fn();

  const renderAssetBoard = (tab: string) =>
    render(
      <Provider store={store}>
        <AssetBoard tab={tab} />
      </Provider>,
    );

  beforeEach(() => {
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );

    const mockAssets = [
      {
        name: 'Asset 1',
        description: 'Test Asset',
        path: 'path1',
        type: 'Digital Twins',
        isPrivate: true,
      },
    ];

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) =>
        selector({
          assets: { items: mockAssets },
          digitalTwin: {
            shouldFetchDigitalTwins: false,
            digitalTwin: {},
          },
          executionHistory: {
            entries: [],
            selectedExecutionId: null,
            loading: false,
            error: null,
          },
        }),
    );
  });

  it('renders AssetBoard with Manage Card', () => {
    renderAssetBoard('Manage');
    expect(screen.getByText('Asset Card Manage')).toBeInTheDocument();
  });

  it('renders AssetBoard with Execute Card', () => {
    renderAssetBoard('Execute');
    expect(screen.getByText('Asset Card Execute')).toBeInTheDocument();
  });

  it('dispatches deleteAsset action when onDelete is called', () => {
    renderAssetBoard('Manage');
    const deleteButton = screen.getByText('Delete');
    deleteButton.click();
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('renders loading spinner when shouldFetchDigitalTwins is true', async () => {
    mockFetchDigitalTwins.mockImplementation(() => new Promise(() => {}));

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) =>
        selector({
          assets: { items: [] },
          digitalTwin: {
            shouldFetchDigitalTwins: true,
            digitalTwin: {},
          },
          executionHistory: {
            entries: [],
            selectedExecutionId: null,
            loading: false,
            error: null,
          },
        }),
    );

    renderAssetBoard('Manage');
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
  });

  it('renders content after fetch completes', async () => {
    mockFetchDigitalTwins.mockResolvedValue(undefined);

    const mockAssets = [
      {
        name: 'Fetched Asset',
        description: 'Fetched',
        path: 'path2',
        type: 'Digital Twins',
        isPrivate: true,
      },
    ];

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) =>
        selector({
          assets: { items: mockAssets },
          digitalTwin: {
            shouldFetchDigitalTwins: true,
            digitalTwin: {},
          },
          executionHistory: {
            entries: [],
            selectedExecutionId: null,
            loading: false,
            error: null,
          },
        }),
    );

    renderAssetBoard('Manage');

    await waitFor(() => {
      expect(screen.getByText('Asset Card Manage')).toBeInTheDocument();
    });
  });

  it('renders error message when fetch fails', async () => {
    mockFetchDigitalTwins.mockImplementation(async (_dispatch, setError) => {
      if (setError) setError('Failed to load digital twins');
    });

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) =>
        selector({
          assets: { items: [] },
          digitalTwin: {
            shouldFetchDigitalTwins: true,
            digitalTwin: {},
          },
          executionHistory: {
            entries: [],
            selectedExecutionId: null,
            loading: false,
            error: null,
          },
        }),
    );

    renderAssetBoard('Manage');

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load digital twins'),
      ).toBeInTheDocument();
    });
  });
});
