import ChangeFileNameDialog from 'preview/route/digitaltwins/create/ChangeFileNameDialog';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import store from 'store/store';
import * as fileUtils from 'preview/util/fileUtils';

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
      .spyOn(fileUtils, 'handleChangeFileName')
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
});
