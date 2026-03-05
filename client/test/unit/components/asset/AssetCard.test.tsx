import { screen } from '@testing-library/react';
import { AssetCardExecute } from 'components/asset/AssetCard';
import * as React from 'react';
import { formatName } from 'model/backend/digitalTwin';
import { asset, setupMockStore, renderComponent } from './assetCard.testUtil';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('components/LogDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="log-dialog" />,
}));

jest.mock('route/digitaltwins/manage/DetailsDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="details-dialog" />,
}));

describe('AssetCard', () => {
  it('renders AssetCardExecute with digital twin description', () => {
    setupMockStore('Asset description', 'Digital Twin description');
    renderComponent(AssetCardExecute, { asset });

    expect(screen.getByText(formatName(asset.name))).toBeInTheDocument();
    expect(screen.getByText('Digital Twin description')).toBeInTheDocument();
    expect(screen.getByTestId('log-dialog')).toBeInTheDocument();
  });
});
