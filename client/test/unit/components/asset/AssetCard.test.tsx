import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { AssetCardManage, AssetCardExecute } from 'components/asset/AssetCard';
import { Provider } from 'react-redux';
import store from 'store/store';
import { enableFetchMocks } from 'jest-fetch-mock';
import '@testing-library/jest-dom';

enableFetchMocks();

if (!AbortSignal.timeout) {
  AbortSignal.timeout = (ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('TimeoutError')), ms);
    return controller.signal;
  };
}

jest.deepUnmock('components/asset/AssetCard');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
}));

jest.mock('util/envUtil', () => ({
  ...jest.requireActual('util/envUtil'),
  getAuthority: jest.fn(() => 'https://example.com'),
}));

jest.mock('');

describe('AssetCard', () => {
  const assetMock = {
    name: 'TestName',
    path: 'testPath',
    description: 'testDescription',
  };

  test('renders Asset Card Manage correctly', () => {
    render(
      <Provider store={store}>
        <AssetCardManage asset={assetMock} />
        );
      </Provider>,
    );

    expect(screen.getByText(assetMock.name)).toBeInTheDocument();
  });

  test('renders Asset Card Execute correctly', () => {
    render(
      <Provider store={store}>
        <AssetCardExecute asset={assetMock} />
        );
      </Provider>,
    );

    expect(screen.getByText(assetMock.name)).toBeInTheDocument();
  });
});
