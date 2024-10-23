import { render, screen } from '@testing-library/react';
import {
  AssetCardManage,
  AssetCardExecute,
} from 'preview/components/asset/AssetCard';
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
};

describe('AssetCardManage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders AssetCardManage with digital twin description', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        digitalTwin: {
          [asset.name]: { description: 'Digital Twin description' },
        },
      }),
    );

    render(
      <Provider store={store}>
        <AssetCardManage asset={asset} onDelete={() => {}} />
      </Provider>,
    );

    expect(screen.getByText(formatName(asset.name))).toBeInTheDocument();
    expect(screen.getByText('Digital Twin description')).toBeInTheDocument();
    expect(screen.getByTestId('custom-snackbar')).toBeInTheDocument();
    expect(screen.getByTestId('details-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('reconfigure-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
  });
});

describe('AssetCardExecute', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders AssetCardExecute with digital twin description', () => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) =>
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
