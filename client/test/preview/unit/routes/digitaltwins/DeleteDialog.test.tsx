import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteDialog from 'preview/route/digitaltwins/manage/DeleteDialog';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from 'store/store';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('util/gitlabDigitalTwin', () => ({
  formatName: jest.fn(),
}));

describe('DeleteDialog', () => {
  const name = 'testName';
  const setShowLog = jest.fn();
  const onDelete = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the DeleteDialog', () => {
    render(
      <Provider store={store}>
        <DeleteDialog
          name={name}
          showLog={true}
          setShowLog={setShowLog}
          onDelete={onDelete}
        />
        ,
      </Provider>,
    );

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yes/i })).toBeInTheDocument();
  });

  it('handles delete and returns a success message', async () => {
    (useSelector as jest.Mock).mockReturnValue({
      delete: jest.fn().mockResolvedValue('Success'),
    });
    (useDispatch as jest.Mock).mockReturnValue(jest.fn());

    render(
      <Provider store={store}>
        <DeleteDialog
          name={name}
          showLog={true}
          setShowLog={setShowLog}
          onDelete={onDelete}
        />
        ,
      </Provider>,
    );

    const yesButton = screen.getByRole('button', { name: /Yes/i });
    await fireEvent.click(yesButton);

    expect(setShowLog).toHaveBeenCalled();
  });

  it('handles delete and returns an error message', async () => {
    (useSelector as jest.Mock).mockReturnValue({
      delete: jest.fn().mockResolvedValue('Error'),
    });
    (useDispatch as jest.Mock).mockReturnValue(jest.fn());

    render(
      <Provider store={store}>
        <DeleteDialog
          name={name}
          showLog={true}
          setShowLog={setShowLog}
          onDelete={onDelete}
        />
        ,
      </Provider>,
    );

    const yesButton = screen.getByRole('button', { name: /Yes/i });
    await fireEvent.click(yesButton);

    expect(setShowLog).toHaveBeenCalled();
  });

  it('handles close log', () => {
    render(
      <Provider store={store}>
        <DeleteDialog
          name={name}
          showLog={true}
          setShowLog={setShowLog}
          onDelete={onDelete}
        />
        ,
      </Provider>,
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(setShowLog).toHaveBeenCalled();
  });
});
