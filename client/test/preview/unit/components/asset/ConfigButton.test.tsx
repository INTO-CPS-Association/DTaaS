import { screen, render, fireEvent } from '@testing-library/react';
import ReconfigureButton from 'preview/components/asset/ReconfigureButton';
import { Provider } from 'react-redux';
import store from 'store/store';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

describe('ReconfigureButton', () => {
  const renderReconfigureButton = (setShowReconfigure: jest.Mock = jest.fn()) =>
    render(
      <Provider store={store}>
        <ReconfigureButton setShowReconfigure={setShowReconfigure} />
      </Provider>,
    );

  it('renders the Reconfigure button', () => {
    renderReconfigureButton();
    expect(
      screen.getByRole('button', { name: /Reconfigure/i }),
    ).toBeInTheDocument();
  });

  it('toggles setShowReconfigure value correctly', () => {
    let toggleValue = false;
    const mockSetShowReconfigure = jest.fn((callback) => {
      toggleValue = callback(toggleValue);
    });

    renderReconfigureButton(mockSetShowReconfigure);

    const reconfigureButton = screen.getByRole('button', {
      name: /Reconfigure/i,
    });

    fireEvent.click(reconfigureButton);
    expect(toggleValue).toBe(true);

    fireEvent.click(reconfigureButton);
    expect(toggleValue).toBe(false);
  });
});
