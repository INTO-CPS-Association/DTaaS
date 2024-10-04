import { render, screen } from '@testing-library/react';
import AssetCardExecute from 'preview/components/asset/AssetCard';
import * as React from 'react';
import { Provider, useSelector } from 'react-redux';
import store from 'store/store';
import { formatName } from 'preview/util/gitlabDigitalTwin';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('preview/route/digitaltwins/Snackbar', () => ({
  __esModule: true,
  default: () => <div data-testid="custom-snackbar" />,
}));

jest.mock('preview/route/digitaltwins/execute/LogDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="log-dialog" />,
}));

describe('AssetCardExecute', () => {
  const asset = {
    name: 'asset',
    description: 'Asset description',
    path: 'path',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders AssetCardExecute with digital twin description', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        digitalTwin: {
          [asset.name]: { description: 'Digital Twin description' },
        },
      }),
    );

    render(
      <Provider store={store}>
        <AssetCardExecute asset={asset} />
      </Provider>,
    );

    expect(screen.getByText(formatName(asset.name))).toBeInTheDocument();
    expect(screen.getByText('Digital Twin description')).toBeInTheDocument();
    expect(screen.getByTestId('custom-snackbar')).toBeInTheDocument();
    expect(screen.getByTestId('log-dialog')).toBeInTheDocument();
  });
});
