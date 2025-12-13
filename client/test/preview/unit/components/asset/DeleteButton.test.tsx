import DeleteButton from 'preview/components/asset/DeleteButton';
import { Provider } from 'react-redux';
import store from 'store/store';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

describe('DeleteButton', () => {
  const renderDeleteButton = (setShowDelete: jest.Mock = jest.fn()) =>
    render(
      <Provider store={store}>
        <DeleteButton setShowDelete={setShowDelete} />
      </Provider>,
    );

  it('renders the Delete button', () => {
    renderDeleteButton();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('handles button click', () => {
    const mockSetShowDelete = jest.fn();
    renderDeleteButton(mockSetShowDelete);

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    expect(mockSetShowDelete).toHaveBeenCalled();
  });
});
