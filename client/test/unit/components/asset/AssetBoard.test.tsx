import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AssetBoard from 'components/asset/AssetBoard';
import { GitlabInstance } from 'util/gitlab';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { createStore, combineReducers } from 'redux';
import assetsReducer, { deleteAsset } from 'store/assets.slice';
import { Asset } from 'components/asset/Asset';
import { RootState } from 'store/store';
import * as ReactRedux from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('util/envUtil', () => ({
  ...jest.requireActual('util/envUtil'),
  getAuthority: jest.fn(() => 'https://example.com'),
}));

const assetsMock: Asset[] = [
  { name: 'Asset1', path: 'path1', description: 'Description1' },
  { name: 'Asset2', path: 'path2', description: 'Description2' },
];

jest.mock('util/gitlab', () => ({
  GitlabInstance: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
  })),
}));

const mockGitlabInstance = new GitlabInstance(
  'username',
  'authority',
  'access_token',
);

jest.mock('components/asset/AssetCard', () => ({
  AssetCardExecute: jest.fn(({ asset }) => (
    <div>{`Execute ${asset.name}`}</div>
  )),
  AssetCardManage: jest.fn(({ asset, onDelete }) => (
    <div>
      {`Manage ${asset.name}`}
      <button onClick={() => onDelete()}>Delete</button>
    </div>
  )),
}));

const mockStore = createStore(
  combineReducers({
    assets: assetsReducer,
  }),
  {
    assets: {
      items: assetsMock,
    },
  } as RootState,
);

describe('AssetBoard', () => {
  it('renders AssetCardExecute components when tab is "Execute"', () => {
    render(
      <Provider store={mockStore}>
        <AssetBoard
          tab="Execute"
          gitlabInstance={mockGitlabInstance}
          error={null}
        />
      </Provider>,
    );

    const executeCards = screen.getAllByText(/Execute/);
    expect(executeCards).toHaveLength(assetsMock.length);
  });

  it('renders AssetCardManage components when tab is not "Execute"', () => {
    render(
      <Provider store={mockStore}>
        <AssetBoard
          tab="Manage"
          gitlabInstance={mockGitlabInstance}
          error={null}
        />
      </Provider>,
    );

    const manageCards = screen.getAllByText(/Manage/);
    expect(manageCards).toHaveLength(assetsMock.length);
  });

  it('displays an error message when error prop is provided', () => {
    const errorMessage = 'Something went wrong!';
    render(
      <Provider store={mockStore}>
        <AssetBoard
          tab="Manage"
          gitlabInstance={mockGitlabInstance}
          error={errorMessage}
        />
      </Provider>,
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders correctly with no assets', () => {
    const emptyStore = createStore(
      combineReducers({
        assets: assetsReducer,
      }),
      {
        assets: {
          items: [],
        },
      } as unknown as RootState,
    );

    render(
      <Provider store={emptyStore}>
        <AssetBoard
          tab="Manage"
          gitlabInstance={mockGitlabInstance}
          error={null}
        />
      </Provider>,
    );

    const manageCards = screen.queryAllByText(/Manage/);
    expect(manageCards).toHaveLength(0);
  });

  it('dispatches deleteAsset action when delete button is clicked', () => {
    const mockDispatch = jest.fn();
    jest.spyOn(ReactRedux, 'useDispatch').mockReturnValue(mockDispatch);

    render(
      <Provider store={mockStore}>
        <AssetBoard
          tab="Manage"
          gitlabInstance={mockGitlabInstance}
          error={null}
        />
      </Provider>,
    );

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(mockDispatch).toHaveBeenCalledWith(deleteAsset('path1'));
  });
});
