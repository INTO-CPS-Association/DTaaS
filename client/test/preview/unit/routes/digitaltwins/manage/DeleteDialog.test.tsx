import * as React from 'react';
import DeleteDialog from 'preview/route/digitaltwins/manage/DeleteDialog';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import store from 'store/store';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('preview/util/digitalTwin', () => ({
  DigitalTwin: jest.fn().mockImplementation(() => mockDigitalTwin),
  formatName: jest.fn(),
}));

describe('DeleteDialog', () => {
  const showDialog = true;
  const name = 'testName';
  const setShowDialog = jest.fn();
  const onDelete = jest.fn();

  it('renders the DeleteDialog', () => {
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
    expect(screen.getByText(/This step is irreversible/i)).toBeInTheDocument();
  });

  it('handles close dialog', async () => {
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
    const closeButton = screen.getByRole('button', { name: /Cancel/i });
    closeButton.click();
    expect(setShowDialog).toHaveBeenCalled();
  });

  it('handles delete button click', async () => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue({
      delete: jest.fn().mockResolvedValue('Deleted successfully'),
    });

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

    const deleteButton = screen.getByRole('button', { name: /Yes/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
      expect(setShowDialog).toHaveBeenCalledWith(false);
    });
  });

  it('handles delete button click and shows error message', async () => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue({
      delete: jest.fn().mockResolvedValue('Error: deletion failed'),
    });

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

    const deleteButton = screen.getByRole('button', { name: /Yes/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
      expect(setShowDialog).toHaveBeenCalledWith(false);
    });
  });
});
