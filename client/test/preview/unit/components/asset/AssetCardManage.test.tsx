import { screen } from '@testing-library/react';
import AssetCardManage from 'preview/components/asset/AssetCardManage';
import * as React from 'react';
import { formatName } from 'model/backend/digitalTwin';
import {
  asset,
  setupMockStore,
  renderComponent,
} from 'test/unit/components/asset/assetCard.testUtil';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('route/digitaltwins/manage/DetailsDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="details-dialog" />,
}));

jest.mock('preview/route/digitaltwins/manage/ReconfigureDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="reconfigure-dialog" />,
}));

jest.mock('route/digitaltwins/manage/DeleteDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="delete-dialog" />,
}));

describe('AssetCardManage', () => {
  it('renders AssetCardManage with digital twin description', () => {
    setupMockStore('Asset description', 'Digital Twin description');
    renderComponent(AssetCardManage, { asset, onDelete: jest.fn() });

    expect(screen.getByText(formatName(asset.name))).toBeInTheDocument();
    expect(screen.getByText('Digital Twin description')).toBeInTheDocument();
    expect(screen.getByTestId('details-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('reconfigure-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
  });
});
