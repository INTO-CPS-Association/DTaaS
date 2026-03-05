import DetailsButton from 'components/asset/DetailsButton';
import { Provider } from 'react-redux';
import store from 'store/store';
import * as React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import * as redux from 'react-redux';
import { Dispatch } from 'react';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('model/backend/util/digitalTwinAdapter', () => ({
  createDigitalTwinFromData: jest.fn().mockResolvedValue({
    getFullDescription: jest.fn().mockResolvedValue('Mocked description'),
  }),
}));

describe('DetailsButton', () => {
  const renderDetailsButton = (
    assetName: string,
    assetPrivacy: boolean,
    setShowDetails: Dispatch<React.SetStateAction<boolean>>,
  ) =>
    render(
      <Provider store={store}>
        <DetailsButton
          assetName={assetName}
          assetPrivacy={assetPrivacy}
          setShowDetails={setShowDetails}
        />
      </Provider>,
    );

  it('renders the Details button', () => {
    renderDetailsButton('AssetName', true, jest.fn());
    expect(
      screen.getByRole('button', { name: /Details/i }),
    ).toBeInTheDocument();
  });

  it('handles button click and shows details', async () => {
    const mockSetShowDetails = jest.fn();

    const { createDigitalTwinFromData } = jest.requireMock(
      'model/backend/util/digitalTwinAdapter',
    );
    createDigitalTwinFromData.mockResolvedValue({
      DTName: 'AssetName',
      getFullDescription: jest.fn().mockResolvedValue('Mocked description'),
    });

    (
      redux.useSelector as jest.MockedFunction<typeof redux.useSelector>
    ).mockReturnValue({
      DTName: 'AssetName',
      description: 'Test description',
    });

    renderDetailsButton('AssetName', true, mockSetShowDetails);

    const detailsButton = screen.getByRole('button', { name: /Details/i });

    await act(async () => {
      fireEvent.click(detailsButton);
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    await waitFor(() => {
      expect(mockSetShowDetails).toHaveBeenCalledWith(true);
    });
  });
});
