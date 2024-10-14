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

jest.mock('preview/util/gitlabDigitalTwin', () => ({
  DigitalTwin: jest.fn().mockImplementation(() => mockDigitalTwin),
  formatName: jest.fn(),
}));

describe('DeleteDialog', () => {
  const showLog = true;
  const name = 'testName';
  const setShowLog = jest.fn();
  const onDelete = jest.fn();

  it('renders the DeleteDialog', () => {
    render(
      <Provider store={store}>
        <DeleteDialog
          showLog={showLog}
          setShowLog={setShowLog}
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
          showLog={showLog}
          setShowLog={setShowLog}
          name={name}
          onDelete={onDelete}
        />
      </Provider>,
    );
    const closeButton = screen.getByRole('button', { name: /Cancel/i });
    closeButton.click();
    expect(setShowLog).toHaveBeenCalled();
  });

  it('handles delete button click', async () => {
    (useSelector as jest.Mock).mockReturnValue({
      delete: jest.fn().mockResolvedValue('Deleted successfully'),
    });

    render(
      <Provider store={store}>
        <DeleteDialog
          showLog={showLog}
          setShowLog={setShowLog}
          name={name}
          onDelete={onDelete}
        />
      </Provider>,
    );

    const deleteButton = screen.getByRole('button', { name: /Yes/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
      expect(setShowLog).toHaveBeenCalledWith(false);
    });
  });

  it('handles delete button click and shows error message', async () => {
    (useSelector as jest.Mock).mockReturnValue({
      delete: jest.fn().mockResolvedValue('Error: deletion failed'),
    });

    render(
      <Provider store={store}>
        <DeleteDialog
          showLog={showLog}
          setShowLog={setShowLog}
          name={name}
          onDelete={onDelete}
        />
      </Provider>,
    );

    const deleteButton = screen.getByRole('button', { name: /Yes/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
      expect(setShowLog).toHaveBeenCalledWith(false);
    });
  });
});
