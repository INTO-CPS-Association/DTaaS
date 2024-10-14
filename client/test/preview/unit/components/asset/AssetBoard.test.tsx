import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import AssetBoard from 'preview/components/asset/AssetBoard';
import store from 'store/store';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('preview/components/asset/AssetCard', () => ({
  AssetCardManage: ({ onDelete }: { onDelete: () => void }) => (
    <div>
      Asset Card Manage
      <button onClick={onDelete}>Delete</button>
    </div>
  ),
  AssetCardExecute: () => <div>Asset Card Execute</div>,
}));

jest.mock('preview/store/assets.slice', () => ({
  ...jest.requireActual('preview/store/assets.slice'),
}));

describe('AssetBoard', () => {
  const mockDispatch = jest.fn();

  const renderAssetBoard = (tab: string, error: null | string) =>
    render(
      <Provider store={store}>
        <AssetBoard tab={tab} error={error} />
      </Provider>,
    );

  beforeEach(() => {
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    const mockAssets = [
      { name: 'Asset 1', description: 'Test Asset', path: 'path1' },
    ];

    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        assets: { items: mockAssets },
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders AssetBoard with Manage Card', () => {
    renderAssetBoard('Manage', null);

    expect(screen.getByText('Asset Card Manage')).toBeInTheDocument();
  });

  it('renders AssetBoard with Execute Card', () => {
    renderAssetBoard('Execute', null);

    expect(screen.getByText('Asset Card Execute')).toBeInTheDocument();
  });

  it('renders error message when error is present', () => {
    renderAssetBoard('Execute', 'An error occurred');

    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('dispatches deleteAsset action when onDelete is called', () => {
    renderAssetBoard('Manage', null);

    const deleteButton = screen.getByText('Delete');
    deleteButton.click();

    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });
});
