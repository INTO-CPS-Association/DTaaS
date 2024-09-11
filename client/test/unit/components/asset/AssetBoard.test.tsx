import * as React from 'react';
import { render, screen } from '@testing-library/react';
import AssetBoard from 'components/asset/AssetBoard';
import { Asset } from 'components/asset/Asset';
import { GitlabInstance } from 'util/gitlab';
import '@testing-library/jest-dom';
import store from 'store/store';
import { Provider } from 'react-redux';

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
  AssetCardManage: jest.fn(({ asset }) => <div>{`Manage ${asset.name}`}</div>),
}));

describe('AssetBoard', () => {
  it('renders AssetCardExecute components when tab is "Execute"', () => {
    render(
      <Provider store={store}>
        <AssetBoard
          tab="Execute"
          subfolders={assetsMock}
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
      <Provider store={store}>
        <AssetBoard
          tab="Manage"
          subfolders={assetsMock}
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
      <Provider store={store}>
        <AssetBoard
          tab="Manage"
          subfolders={[]}
          gitlabInstance={mockGitlabInstance}
          error={errorMessage}
        />
      </Provider>,
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders correctly with no assets', () => {
    render(
      <Provider store={store}>
        <AssetBoard
          tab="Manage"
          subfolders={[]}
          gitlabInstance={mockGitlabInstance}
          error={null}
        />
      </Provider>,
    );

    const manageCards = screen.queryAllByText(/Manage/);
    expect(manageCards).toHaveLength(0);
  });
});
