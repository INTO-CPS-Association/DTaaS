import { render, screen } from '@testing-library/react';
import {
  AssetCardManage,
  AssetCardExecute,
} from 'preview/components/asset/AssetCard';
import * as React from 'react';
import { Provider, useSelector } from 'react-redux';
import store from 'store/store';
import { formatName } from 'preview/util/digitalTwin';

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

jest.mock('preview/route/digitaltwins/manage/DetailsDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="details-dialog" />,
}));

jest.mock('preview/route/digitaltwins/manage/ReconfigureDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="reconfigure-dialog" />,
}));

jest.mock('preview/route/digitaltwins/manage/DeleteDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="delete-dialog" />,
}));

const asset = {
  name: 'asset',
  description: 'Asset description',
  path: 'path',
  type: 'Digital twins',
  isPrivate: true,
};

const setupMockStore = (assetDescription: string, twinDescription: string) => {
  const state = {
    assets: {
      items: [
        {
          name: 'asset',
          path: 'path',
          isPrivate: true,
          description: assetDescription,
        },
      ],
    },
    digitalTwin: {
      digitalTwin: {
        asset: { description: twinDescription },
      },
    },
  };
  (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
    (selector) => selector(state),
  );
};

const renderComponent = <T extends object>(
  Component: React.JSXElementConstructor<T>,
  props: T,
) => {
  render(
    <Provider store={store}>
      <Component {...props} />
    </Provider>,
  );
};

describe('AssetCard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders AssetCardManage with digital twin description', () => {
    setupMockStore('Asset description', 'Digital Twin description');
    renderComponent(AssetCardManage, { asset, onDelete: jest.fn() });

    expect(screen.getByText(formatName(asset.name))).toBeInTheDocument();
    expect(screen.getByText('Asset description')).toBeInTheDocument();
    expect(screen.getByTestId('custom-snackbar')).toBeInTheDocument();
    expect(screen.getByTestId('details-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('reconfigure-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
  });

  it('renders AssetCardExecute with digital twin description', () => {
    setupMockStore('Asset description', 'Digital Twin description');
    renderComponent(AssetCardExecute, { asset });

    expect(screen.getByText(formatName(asset.name))).toBeInTheDocument();
    expect(screen.getByText('Asset description')).toBeInTheDocument();
    expect(screen.getByTestId('custom-snackbar')).toBeInTheDocument();
    expect(screen.getByTestId('log-dialog')).toBeInTheDocument();
  });
});
