import { render, screen } from '@testing-library/react';
import { AssetCardExecute } from 'preview/components/asset/AssetCard';
import * as React from 'react';
import { Provider } from 'react-redux';
import store from 'store/store';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

describe('AssetCardExecute', () => {
  const asset = { name: 'asset', description: 'description', path: 'path' };
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders AssetCardExecute', () => {
    render(
      <Provider store={store}>
        <AssetCardExecute asset={asset}/>
      </Provider>,
    )

    expect(screen.getByText('asset')).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
  });
});