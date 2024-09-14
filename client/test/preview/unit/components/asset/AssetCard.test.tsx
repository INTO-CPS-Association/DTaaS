import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { AssetCard, AssetCardExecute, CardButtonsContainerExecute } from 'preview/components/asset/AssetCard';
import { setDigitalTwin } from 'store/digitalTwin.slice';
import { GitlabInstance } from 'util/gitlab';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { Asset } from 'preview/components/asset/Asset';
import store from 'store/store';
import '@testing-library/jest-dom';

jest.deepUnmock('preview/components/asset/AssetCard');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('util/gitlab');
jest.mock('util/envUtil', () => ({
  getAuthority: jest.fn(() => 'https://example.com'),
}));

describe('AssetCard', () => {
  const asset: Asset = {
    name: 'Test Asset',
    description: 'Test Description',
    path: 'Test Path',
  };

  it('should render AssetCard with correct props', () => {
    render(
      <Provider store={store}>
        <AssetCard asset={asset} />
      </Provider>
    );
    expect(screen.getByText('Test Asset')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });
});

describe('CardButtonsContainerExecute', () => {
  it('should render StartStopButton and LogButton', () => {
    const setSnackbarOpen = jest.fn();
    const setSnackbarMessage = jest.fn();
    const setSnackbarSeverity = jest.fn();
    const setShowLog = jest.fn();

    render(
      <Provider store={store}>
      <CardButtonsContainerExecute
        assetName="Test Asset"
        setSnackbarOpen={setSnackbarOpen}
        setSnackbarMessage={setSnackbarMessage}
        setSnackbarSeverity={setSnackbarSeverity}
        setShowLog={setShowLog}
      />
      </Provider>
    );

    // Verifica che i pulsanti siano renderizzati
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Log')).toBeInTheDocument();
  });
});


describe('AssetCardExecute', () => {
  const asset: Asset = {
    name: 'Test Asset',
    description: 'Test Description',
    path: 'Test Path',
  };

  beforeEach(() => {
    (GitlabInstance as jest.Mock).mockImplementation(() => ({
      init: jest.fn(),
    }));
    store.dispatch(setDigitalTwin({ assetName: asset.name, digitalTwin: new DigitalTwin(asset.name, new GitlabInstance('user1', 'authority', 'token1')) }));
  });

  it('should render AssetCardExecute and handle interactions', async () => {
    render(
      <Provider store={store}>
        <AssetCardExecute asset={asset} />
      </Provider>
    );

    expect(screen.getByText('Test Asset')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Log')).toBeInTheDocument();
  });
});
