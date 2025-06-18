import * as React from 'react';
import SidebarDialog from 'preview/route/digitaltwins/editor/SidebarDialog';
import { fireEvent, render, screen } from '@testing-library/react';
import { FileState } from 'model/backend/gitlab/UtilityInterfaces';
import * as SidebarFunctions from 'preview/route/digitaltwins/editor/sidebarFunctions';

describe('SidebarDialog', () => {
  const isOpen = true;
  const newFileName = 'newFileName';
  const setNewFileName = jest.fn();
  const setIsFileNameDialogOpen = jest.fn();
  const errorMessage = 'errorMessage';
  const setErrorMessage = jest.fn();
  const files: FileState[] = [];
  const dispatch = jest.fn();

  beforeEach(() => {
    render(
      <SidebarDialog
        isOpen={isOpen}
        newFileName={newFileName}
        setNewFileName={setNewFileName}
        setIsFileNameDialogOpen={setIsFileNameDialogOpen}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        files={files}
        dispatch={dispatch}
      />,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the SidebarDialog component', () => {
    expect(screen.getByText('Enter the file name')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('calls setNewFileName when the input value changes', () => {
    const textField = screen.getByRole('textbox');
    fireEvent.change(textField, { target: { value: 'testFileName' } });
    expect(setNewFileName).toHaveBeenCalledWith('testFileName');
  });

  it('handles close dialog', async () => {
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    cancelButton.click();
    expect(setIsFileNameDialogOpen).toHaveBeenCalled();
    expect(setNewFileName).toHaveBeenCalled();
    expect(setErrorMessage).toHaveBeenCalled();
  });

  it('handles file submit', async () => {
    const handleFileSubmitSpy = jest
      .spyOn(SidebarFunctions, 'handleFileSubmit')
      .mockImplementation(jest.fn());
    const addButton = screen.getByRole('button', { name: /Add/i });
    addButton.click();
    expect(handleFileSubmitSpy).toHaveBeenCalled();
  });
});
