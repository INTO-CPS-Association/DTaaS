import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { createStore, combineReducers } from 'redux';
import {
  AssetCardManage,
  AssetCardExecute,
  CardButtonsContainerManage,
  CardButtonsContainerExecute,
} from 'components/asset/AssetCard';
import assetsReducer from 'store/assets.slice';
import { Asset } from 'components/asset/Asset';
import { RootState } from 'store/store';
import { setDigitalTwin } from 'store/digitalTwin.slice';
import DigitalTwin from 'util/gitlabDigitalTwin';

jest.mock('route/digitaltwins/Snackbar', () => () => <div>Snackbar</div>);
jest.mock(
  'route/digitaltwins/DetailsDialog',
  () =>
    ({
      showLog,
      setShowLog,
      name,
    }: {
      showLog: boolean;
      setShowLog: (show: boolean) => void;
      name: string;
    }) => (
      <div>
        DetailsDialog for {name}
        {showLog && <button onClick={() => setShowLog(false)}>Close</button>}
      </div>
    ),
);
jest.mock(
  'route/digitaltwins/DeleteDialog',
  () =>
    ({
      showLog,
      setShowLog,
      name,
      onDelete,
    }: {
      showLog: boolean;
      setShowLog: (show: boolean) => void;
      name: string;
      onDelete: () => void;
    }) => (
      <div>
        DeleteDialog for {name}
        {showLog && (
          <button
            onClick={() => {
              setShowLog(false);
              onDelete();
            }}
          >
            Delete
          </button>
        )}
      </div>
    ),
);
jest.mock(
  'route/digitaltwins/LogDialog',
  () =>
    ({
      showLog,
      setShowLog,
      name,
    }: {
      showLog: boolean;
      setShowLog: (show: boolean) => void;
      name: string;
    }) => (
      <div>
        LogDialog for {name}
        {showLog && <button onClick={() => setShowLog(false)}>Close</button>}
      </div>
    ),
);

const assetsMock: Asset[] = [
  { name: 'Asset1', path: 'path1', description: 'Description1' },
  { name: 'Asset2', path: 'path2', description: 'Description2' },
];

interface DigitalTwinState {
  [key: string]: DigitalTwin;
}

interface SetDigitalTwinAction {
  type: typeof setDigitalTwin.type;
  payload: {
    assetName: string;
    digitalTwin: DigitalTwin;
  };
}

type DigitalTwinActions = SetDigitalTwinAction;

const mockStore = createStore(
  combineReducers({
    assets: assetsReducer,
    digitalTwin: (state: DigitalTwinState = {}, action: DigitalTwinActions) => {
      switch (action.type) {
        case setDigitalTwin.type:
          return {
            ...state,
            [action.payload.assetName]: action.payload.digitalTwin,
          };
        default:
          return state;
      }
    },
  }),
  {
    assets: { items: assetsMock },
  } as RootState,
);

describe('AssetCard Components', () => {
  it('renders AssetCard with asset and buttons', () => {
    render(
      <Provider store={mockStore}>
        <AssetCardManage asset={assetsMock[0]} onDelete={() => {}} />
      </Provider>,
    );

    expect(screen.getByText(/Description1/)).toBeInTheDocument();
  });

  it('renders CardButtonsContainerManage with buttons', () => {
    const setShowDetailsLog = jest.fn();
    const setShowDeleteLog = jest.fn();

    render(
      <CardButtonsContainerManage
        name="Asset1"
        setShowDetailsLog={setShowDetailsLog}
        setShowDeleteLog={setShowDeleteLog}
      />,
    );

    expect(screen.getByText('DetailsButton')).toBeInTheDocument();
    expect(screen.getByText('ReconfigureButton')).toBeInTheDocument();
    expect(screen.getByText('DeleteButton')).toBeInTheDocument();
  });

  it('handles button clicks in CardButtonsContainerManage', () => {
    const setShowDetailsLog = jest.fn();
    const setShowDeleteLog = jest.fn();

    render(
      <CardButtonsContainerManage
        name="Asset1"
        setShowDetailsLog={setShowDetailsLog}
        setShowDeleteLog={setShowDeleteLog}
      />,
    );

    fireEvent.click(screen.getByText('DetailsButton'));
    expect(setShowDetailsLog).toHaveBeenCalled();

    fireEvent.click(screen.getByText('DeleteButton'));
    expect(setShowDeleteLog).toHaveBeenCalled();
  });

  it('renders CardButtonsContainerExecute with buttons', () => {
    const setShowLog = jest.fn();

    render(
      <CardButtonsContainerExecute
        assetName="Asset1"
        setShowLog={setShowLog}
      />,
    );

    expect(screen.getByText('StartStopButton')).toBeInTheDocument();
    expect(screen.getByText('LogButton')).toBeInTheDocument();
  });

  it('handles button clicks in CardButtonsContainerExecute', () => {
    const setShowLog = jest.fn();

    render(
      <CardButtonsContainerExecute
        assetName="Asset1"
        setShowLog={setShowLog}
      />,
    );

    fireEvent.click(screen.getByText('StartStopButton'));

    fireEvent.click(screen.getByText('LogButton'));
    expect(setShowLog).toHaveBeenCalled();
  });

  it('renders AssetCardManage correctly and handles dialogs', () => {
    const handleDelete = jest.fn();

    render(
      <Provider store={mockStore}>
        <AssetCardManage asset={assetsMock[0]} onDelete={handleDelete} />
      </Provider>,
    );

    expect(screen.getByText('Snackbar')).toBeInTheDocument();
    fireEvent.click(screen.getByText('DetailsDialog for Asset1'));
    fireEvent.click(screen.getByText('Close'));

    fireEvent.click(screen.getByText('DeleteDialog for Asset1'));
    fireEvent.click(screen.getByText('Delete'));
    expect(handleDelete).toHaveBeenCalled();
  });

  it('renders AssetCardExecute correctly and handles dialogs', () => {
    render(
      <Provider store={mockStore}>
        <AssetCardExecute asset={assetsMock[0]} />
      </Provider>,
    );

    expect(screen.getByText('Snackbar')).toBeInTheDocument();
    fireEvent.click(screen.getByText('LogDialog for Asset1'));
    fireEvent.click(screen.getByText('Close'));
  });
});
