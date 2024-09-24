import { render, screen } from '@testing-library/react';
import { AssetCardExecute } from 'preview/components/asset/AssetCard';
import * as React from 'react';
import { Provider } from 'react-redux';
import store from 'store/store';
import { useSelector } from 'react-redux';
import { formatName } from 'util/gitlabDigitalTwin';

// Mocking react-redux to retain actual functionality
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(), // Mock useSelector
}));

// Mocking CustomSnackbar and LogDialog
jest.mock('preview/route/digitaltwins/Snackbar', () => ({
  __esModule: true,
  default: () => <div data-testid="custom-snackbar" />,
}));

jest.mock('preview/route/digitaltwins/execute/LogDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="log-dialog" />,
}));

describe('AssetCardExecute', () => {
  const asset = { name: 'asset', description: 'description', path: 'path' };
  
  // Set the mock return value for useSelector
  beforeEach(() => {
    (useSelector as jest.Mock).mockReturnValue({ description: asset.description });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders AssetCardExecute', () => {
    render(
      <Provider store={store}>
        <AssetCardExecute asset={asset} />
      </Provider>,
    );

    expect(screen.getByText(formatName(asset.name))).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
    expect(screen.getByTestId('custom-snackbar')).toBeInTheDocument();
    expect(screen.getByTestId('log-dialog')).toBeInTheDocument();
  });
});
