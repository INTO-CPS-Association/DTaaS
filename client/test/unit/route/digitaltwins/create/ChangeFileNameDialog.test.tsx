import ChangeFileNameDialog from 'route/digitaltwins/create/ChangeFileNameDialog';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import store from 'store/store';
import * as fileActions from 'util/fileActions';

describe('ChangeFileNameDialog', () => {
  const showDialog = true;
  const setShowDialog = jest.fn();
  const fileName = 'testName';

  beforeEach(() => {
    render(
      <Provider store={store}>
        <ChangeFileNameDialog
          open={showDialog}
          setOpenChangeFileNameDialog={setShowDialog}
          fileName={fileName}
          setFileName={jest.fn()}
          setFileType={jest.fn()}
        />
      </Provider>,
    );
  });

  it('renders the ChangeFileNameDialog', () => {
    expect(screen.getByText(/Change the file name/i)).toBeInTheDocument();
  });

  it('handles close dialog', async () => {
    const closeButton = screen.getByRole('button', { name: /Cancel/i });
    closeButton.click();
    expect(setShowDialog).toHaveBeenCalled();
  });

  it('handles change file name', async () => {
    const handleChangeFileNameSpy = jest
      .spyOn(fileActions, 'handleChangeFileName')
      .mockImplementation(jest.fn());

    const changeButton = screen.getByRole('button', { name: /Change/i });
    changeButton.click();
    expect(handleChangeFileNameSpy).toHaveBeenCalled();
  });

  it('handles text field change', async () => {
    const textField = screen.getByRole('textbox');
    fireEvent.change(textField, {
      target: { value: 'newFileName' },
    });
    expect(textField).toHaveValue('newFileName');
  });

  it('adds logger attributes to rename controls', () => {
    const textField = screen.getByRole('textbox');
    expect(textField).toHaveAttribute('data-logger-element', 'input');
    expect(textField).toHaveAttribute('data-logger-label', 'Rename File Input');
    expect(screen.getByRole('button', { name: /Cancel/i })).toHaveAttribute(
      'data-logger-label',
      'Rename File Cancel',
    );
    expect(screen.getByRole('button', { name: /Change/i })).toHaveAttribute(
      'data-logger-label',
      'Rename File Confirm',
    );
  });
});
