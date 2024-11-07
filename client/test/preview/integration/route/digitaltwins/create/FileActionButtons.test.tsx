import { render, screen } from '@testing-library/react';
import FileActionButtons from 'preview/route/digitaltwins/create/FileActionButtons';
import * as React from 'react';
import { act } from 'react';

describe('FileActionButtons', () => {
  const setOpenDeleteFileDialog = jest.fn();
  const setOpenChangeFileNameDialog = jest.fn();

  beforeEach(() => {
    act(() => {
      render(
        <FileActionButtons
          fileName="testName"
          setOpenDeleteFileDialog={setOpenDeleteFileDialog}
          setOpenChangeFileNameDialog={setOpenChangeFileNameDialog}
        />,
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('handles click on delete button', () => {
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    act(() => {
      deleteButton.click();
    });

    expect(setOpenDeleteFileDialog).toHaveBeenCalled();
  });

  it('handles click on change file name button', () => {
    const changeFileNameButton = screen.getByRole('button', {
      name: /Change file name/i,
    });
    act(() => {
      changeFileNameButton.click();
    });

    expect(setOpenChangeFileNameDialog).toHaveBeenCalled();
  });
});
