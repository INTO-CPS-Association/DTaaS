import * as React from 'react';
import { render, screen } from '@testing-library/react';
import AssetBoard from 'components/asset/AssetBoard';
import { Asset } from 'components/asset/Asset';
import { GitlabInstance } from 'util/gitlab';
import '@testing-library/jest-dom';
import store from 'store/store';
import { Provider } from 'react-redux';

jest.unmock('components/asset/AssetBoard');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('util/envUtil', () => ({
  ...jest.requireActual('util/envUtil'),
  getAuthority: jest.fn(() => 'https://example.com'),
}));

jest.mock('')

const assetsMock: Asset[] = [
  { name: 'Asset1', path: 'path1', description: 'Description1' },
  { name: 'Asset2', path: 'path2', description: 'Description2' },
];

jest.mock('util/gitlab', () => ({
  GitlabInstance: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
  })),
}));

const mockGitlabInstance = new GitlabInstance('username', 'authority', 'access_token');

describe('AssetBoard', () => {
  it('renders AssetCard components for each asset', () => {
    render(
    <Provider store={store}>
    <AssetBoard subfolders={assetsMock} gitlabInstance={mockGitlabInstance} error={null} />);
    </Provider>
    );
    const cards = screen.getAllByText(/Description/);
    expect(cards).toHaveLength(assetsMock.length);
  });

  it('displays an error message when error prop is provided', () => {
    const errorMessage = 'Something went wrong!';
    render(<AssetBoard subfolders={[]} gitlabInstance={mockGitlabInstance} error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders correctly with no assets', () => {
    render(<AssetBoard subfolders={[]} gitlabInstance={mockGitlabInstance} error={null} />);
    const cards = screen.queryAllByText(/Description/);
    expect(cards).toHaveLength(0);
  });
});