import * as React from 'react';
import { render, screen } from '@testing-library/react';
import AssetCardExecute from 'components/asset/AssetCard';
import { Provider } from 'react-redux';
import store from 'store/store';
import '@testing-library/jest-dom';

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

  beforeEach(() => {
    render(
      <Provider store={store}>
        <AssetCardExecute asset={assetMock} />
        );
      </Provider>,
    );
  });

  it('renders asset name correctly', () => {
    expect(screen.getByText(assetMock.name)).toBeInTheDocument();
  });
});
