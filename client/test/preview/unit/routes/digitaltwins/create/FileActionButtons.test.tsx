import FileActionButtons from 'preview/route/digitaltwins/create/FileActionButtons';
import * as React from 'react';
import { render, screen } from '@testing-library/react';

describe('FileActionButtons', () => {
  const setOpenDeleteFileDialog = jest.fn();

  beforeEach(() => {
    render(
      <FileActionButtons
        fileName="file"
        setOpenDeleteFileDialog={setOpenDeleteFileDialog}
        setOpenChangeFileNameDialog={jest.fn()}
      />,
    );
  });
  it('should render FileActionButtons', () => {
    expect(screen.getByText('Delete File')).toBeInTheDocument();
    expect(screen.getByText('Change File Name')).toBeInTheDocument();
  });

  it('handles click on delete file button', () => {
    screen.getByText('Delete File').click();
    expect(setOpenDeleteFileDialog).toBeCalledWith(true);
  });

  it('handles click on change file name button', () => {
    screen.getByText('Change File Name').click();
    expect(setOpenDeleteFileDialog).not.toBeCalled();
  });
});
