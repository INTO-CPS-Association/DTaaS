import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import AssetBoard from 'preview/components/asset/AssetBoard';
import store from 'store/store';

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

jest.mock('preview/util/init', () => ({
  fetchAssetsAndCreateTwins: jest.fn(),
}));

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
      { name: 'Asset 1', description: 'Test Asset', path: 'path1' },
    ];

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) =>
        selector({
          assets: { items: mockAssets },
        }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  it('shows error message when error is set', () => {
    const realUseState = React.useState;

    const stubInitialState: unknown = ['Error message'];
    jest
      .spyOn(React, 'useState')
      .mockImplementationOnce(() => realUseState(stubInitialState));

    renderAssetBoard('Manage');

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
