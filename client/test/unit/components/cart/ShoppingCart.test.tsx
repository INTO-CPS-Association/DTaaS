import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDispatch, useSelector } from 'react-redux';
import ShoppingCart from 'components/cart/ShoppingCart';
import { logDismiss } from 'util/logger/logger';

jest.mock('components/cart/CartList', () => ({
  __esModule: true,
  default: () => <div data-testid="cart-list" />,
}));

jest.mock('util/logger/logger', () => ({
  logDismiss: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('ShoppingCart', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
    (useSelector as unknown as jest.Mock).mockReturnValue({ assets: [] });
    render(<ShoppingCart />);
  });

  it('opens the clear-cart confirmation dialog when Clear is clicked', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('Confirm Clear')).toBeInTheDocument();
  });

  it('closes the dialog without clearing when No is clicked', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    await waitFor(() => {
      expect(screen.queryByText('Confirm Clear')).not.toBeInTheDocument();
    });
  });

  it('logs the dismissal and closes when the dialog is dismissed via Escape', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(logDismiss).toHaveBeenCalledWith({
      element: 'dialog',
      label: 'Confirm Clear Cart',
      reason: 'escapeKeyDown',
      context: { cart: { count: 0 } },
    });
    await waitFor(() => {
      expect(screen.queryByText('Confirm Clear')).not.toBeInTheDocument();
    });
  });

  it('navigates to the digital twins preview when Proceed is clicked', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    expect(mockNavigate).toHaveBeenCalledWith('/preview/digitaltwins');
  });
});
