import DeleteDialog from 'preview/route/digitaltwins/manage/DeleteDialog';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import store from 'store/store';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('model/backend/digitalTwin', () => ({
  DigitalTwin: jest.fn().mockImplementation(() => mockDigitalTwin),
  formatName: jest.fn(),
}));

jest.mock('model/backend/util/digitalTwinAdapter', () => ({
  createDigitalTwinFromData: jest.fn().mockResolvedValue({
    DTName: 'TestDigitalTwin',
    delete: jest.fn().mockResolvedValue('Digital twin deleted successfully'),
  }),
}));

describe('DeleteDialog', () => {
  const showDialog = true;
  const name = 'testName';
  const setShowDialog = jest.fn();
  const onDelete = jest.fn();

  const setupDeleteTest = (deleteResult: string) => {
    (createDigitalTwinFromData as jest.Mock).mockResolvedValueOnce({
      DTName: name,
      delete: jest.fn().mockResolvedValue(deleteResult),
    });

    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue({
      DTName: name,
      description: 'Test description',
    });
  };

  const renderDeleteDialog = () =>
    render(
      <Provider store={store}>
        <DeleteDialog
          showDialog={showDialog}
          setShowDialog={setShowDialog}
          name={name}
          onDelete={onDelete}
        />
      </Provider>,
    );

  const clickDeleteAndVerify = async () => {
    const deleteButton = screen.getByRole('button', { name: /Yes/i });

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
      expect(setShowDialog).toHaveBeenCalledWith(false);
    });
  };

  it('renders the DeleteDialog', () => {
    renderDeleteDialog();
    expect(screen.getByText(/This step is irreversible/i)).toBeInTheDocument();
  });

  it('handles close dialog', () => {
    renderDeleteDialog();
    const closeButton = screen.getByRole('button', { name: /Cancel/i });
    closeButton.click();
    expect(setShowDialog).toHaveBeenCalled();
  });

  it('handles delete button click', async () => {
    setupDeleteTest('Deleted successfully');
    renderDeleteDialog();
    await clickDeleteAndVerify();
  });

  it('handles delete button click and shows error message', async () => {
    setupDeleteTest('Error: deletion failed');
    renderDeleteDialog();
    await clickDeleteAndVerify();
  });
});
